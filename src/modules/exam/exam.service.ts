import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateExamDto, UpdateAnswersDto } from './dto';
import { ExamRepository } from '@models/index';
import * as fs from 'fs';
import { Types } from 'mongoose';
import { runPythonScript } from '@utils/index';
import { AnswerStatus, BubbleState, ProcessingStatus, Tasks } from '@common/index';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';


@Injectable()
export class ExamService {

  constructor(
    private readonly examRepository: ExamRepository,
    @InjectQueue(Tasks.PREPROCESS)
    private preprocessingQueue: Queue,
  ) { }

  async create(createExamDto: CreateExamDto, userId: string) {
    const examExist = await this.examRepository.getOne({ title: createExamDto.title, createdBy: new Types.ObjectId(userId) })
    if (examExist) {
      throw new ConflictException("Exam alredy exist")
    }

    let questions: any = []

    for (let i = 0; i < createExamDto.questionsNumber; i++) {
      let question = {
        questionNumber: i + 1,
        answersIndex: [],
        status: AnswerStatus.UNANSWERED,
        weight: createExamDto.weight || 1,
      }
      questions.push(question)
    }

    return await this.examRepository.create({ 
      title: createExamDto.title,
      doctorName: createExamDto.doctorName,
      department: createExamDto.department,
      answerKey: questions,
      totalQuestions: createExamDto.questionsNumber,
      totalMarks: createExamDto.questionsNumber * (createExamDto.weight || 1),
      createdBy: new Types.ObjectId(userId),
    });

  }


  async findAll(userId: string) {
    const exams = await this.examRepository.getAll({ createdBy: new Types.ObjectId(userId) }, {}, { projection: { answerKey: 0 } });
    if (!exams) {
      throw new NotFoundException('Exams not found');
    }
    return exams;
  }

  async findOne(id: string, userId: string) {
    const exam = await this.examRepository.getOne({ _id: id, createdBy: new Types.ObjectId(userId) });
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }
    return exam;
  }

  async uploadModelAnswer(id: string, file: Express.Multer.File, userId: string) {

    const examExist = await this.findOne(id, userId)
    if (!examExist) {
      throw new NotFoundException('Exam not found');
    }

    // remove old answer sheet if exists
    if (examExist.answerSheetUrl && fs.existsSync(examExist.answerSheetUrl)) {
      fs.unlinkSync(examExist.answerSheetUrl);
    }

    // Save file to disk (exam folder with exam id)
    const folderPath = `exams/${id}`;
    
    // Handle file extension safely
    const fileExtension = file.originalname.includes('.') 
      ? file.originalname.split('.').pop() 
      : 'pdf'; // Default to pdf if no extension
    const filePath = `${folderPath}/model-answer.${fileExtension}`;
    
    // Create exam folder if not exists
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Update file location from temp to exam folder
    fs.copyFileSync(file.path, filePath);
    // remove temp file
    fs.unlinkSync(file.path);

    // pefor saving to db, convert pdf to png if pdf (python pdf converter)
    let pngPath: string = '';
    try {
      // Sync processing: png converter → preprocess → detect answers → store in DB
      // 1. png converter
      console.log('Converting PDF to PNG...');
      let result = await runPythonScript(Tasks.PNG_CONVERTER, filePath) as any;
      result = JSON.parse(result);

      if (!result.success) {
        // delete the file if conversion failed
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        throw new InternalServerErrorException("Failed to convert PDF to PNG: " + result.message);
      }
      if (result.data.length > 1) {
        // delete the files if multiple converted images found
        for (const file of result.data) {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        }
        throw new BadRequestException("Multiple images found in the PDF, only one model answer is allowed");
      }


      // 2. Preprocess the PNG image
      console.log('Starting preprocessing...');
      pngPath = result.data[0]; // Use the converted PNG path
      let preprocessResult = await runPythonScript(Tasks.PREPROCESS, pngPath) as any;
      preprocessResult = JSON.parse(preprocessResult);
      
      if (!preprocessResult.success) {
        // Clean up PNG file if preprocessing failed
        if (fs.existsSync(pngPath)) {
          fs.unlinkSync(pngPath);
        }
        throw new Error('Preprocessing failed: ' + preprocessResult.data);
      }
      
      // 3. Detect answers from the model answer sheet
      console.log('Detecting model answers...');
      let answersResult = await runPythonScript(Tasks.DETECT_ANSWER, pngPath, examExist.totalQuestions) as any;
      let { data, success } = JSON.parse(answersResult);
      
      if (!success) {
        // Clean up PNG file if answer detection failed
        if (fs.existsSync(pngPath)) {
          fs.unlinkSync(pngPath);
        }
        throw new Error('Answer detection failed: ' + data);
      }
      
      // Validate data exists and has correct structure
      if (!data || !Array.isArray(data) || data.length === 0) {
        // Clean up PNG file if data is invalid
        if (fs.existsSync(pngPath)) {
          fs.unlinkSync(pngPath);
        }
        throw new Error('Invalid answer detection result: No data received');
      }
      
      let choices: any[] = [];
      // 4. Convert to answerKey format
      
      for (let i = 0; i < data.length; i++) {
        const question = data[i];
          let status = AnswerStatus.UNANSWERED;
          let answersIndex: number[] = [];    

          // Get indices of filled bubbles (value = 2)
          question.forEach((bubble: any, index: number) => {
              if (bubble === BubbleState.FILLED) {
                  answersIndex.push(index);
              }
          });

          // Check for ambiguous bubbles (value = 0)
          const hasAmbiguous = question.some((bubble: any) => bubble === BubbleState.AMBIGUOUS);
          
          if (hasAmbiguous) {
              status = AnswerStatus.AMBIGUOUS;
          } else if (answersIndex.length === 0) {
              status = AnswerStatus.UNANSWERED;
          } else if (answersIndex.length > 1) {
            status = AnswerStatus.MULTIPLE;
          } else {
              status = AnswerStatus.ANSWERED;
            }

          choices.push({ questionNumber: i+1, answersIndex, status });
      }
      
      
      // 5. Update exam with model answers
      const updatedExam = await this.examRepository.findOneAndUpdate(
        { _id: id }, 
        { 
          answerSheetUrl: pngPath,
          answerKey: choices,
          processingStatus: ProcessingStatus.DONE
        },
        { returnDocument: 'after' } // Return the updated document
      );
      
      console.log('Model answer processing completed.');
      
      return updatedExam;
      
    } catch (error) {
      // Clean up files if processing failed
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      if (pngPath && fs.existsSync(pngPath)) {
        fs.unlinkSync(pngPath);
      }
      
      await this.examRepository.findOneAndUpdate({ _id: id }, { answerSheetUrl: "", answerKey: [], processingStatus: ProcessingStatus.FAILED });
      throw new BadRequestException('Failed to process model answer: ' + error.message);
    }
  }


  async updateAnswers(id: string, updateAnswersDto: UpdateAnswersDto, userId: string) {
    
    let exam = await this.findOne(id, userId);

    if (!exam || exam.processingStatus !== ProcessingStatus.DONE) {
      throw new BadRequestException('Exam not found or not processed yet');
    }

    // Create a map of updated answers for quick lookup
    const updatedAnswersMap = new Map();
    if (updateAnswersDto.answers && Array.isArray(updateAnswersDto.answers)) {
      updateAnswersDto.answers.forEach(answer => {
        updatedAnswersMap.set(answer.questionNumber, answer);
      });
    }

    // Update only the questions that were modified
    const updatedAnswerKey = exam.answerKey.map(existingAnswer => {
      const updatedAnswer = updatedAnswersMap.get(existingAnswer.questionNumber);
      
      let finalAnswer = {
        questionNumber: existingAnswer.questionNumber,
        answersIndex: existingAnswer.answersIndex,
        status: existingAnswer.status,
        weight: existingAnswer.weight 
      };

      if (updatedAnswer) {
        // This question was updated - use the new values
        finalAnswer.answersIndex = !updatedAnswer.answersIndex || updatedAnswer.answersIndex.length === 0 ? existingAnswer.answersIndex : updatedAnswer.answersIndex;
        finalAnswer.status = AnswerStatus.ANSWERED; // Set status to ANSWERED when answer is provided
        finalAnswer.weight = updatedAnswer.weight || existingAnswer.weight;
      } 

      return finalAnswer;
    });

    // Save exam with updated answerKey    
    const result = await this.examRepository.findOneAndUpdate(
      { _id: id }, 
      { answerKey: updatedAnswerKey }, 
      { returnDocument: 'after' }
    );
    
    // Also fetch fresh data to verify
    const freshExam = await this.examRepository.getOne({ _id: id });
    return result;
  }

  async updateStatus(id: string, status: ProcessingStatus) {
    const exam = await this.examRepository.findOneAndUpdate({ _id: id }, {
      processingStatus: status
    }, { new: true });
    return exam;
  }
  
  async deleteModelAnswer(id: string, userId: string) {
    const exam = await this.examRepository.findOneAndUpdate({ _id: id }, {
      answerSheetUrl: "",
      answerKey: [],
      totalMarks: 0,
      totalQuestions: 0,
      processingStatus: ProcessingStatus.PENDING
    }, { returnDocument: 'after' });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    return exam;
  }

}
