import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateExamDto } from './dto/create-exam.dto';
import { ExamRepository } from 'src/models';
import * as fs from 'fs';
import { ModelAnswerDto } from './dto/model-answer.dto';


@Injectable()
export class ExamService {

  constructor(private readonly examRepository: ExamRepository) {}

  async create(createExamDto: CreateExamDto) {
    const examExist = await this.examRepository.getOne({title: createExamDto.title})
    if(examExist){
      throw new ConflictException("Exam alredy exist")
    }
    return await this.examRepository.create({title: createExamDto.title});
  }

  async findAll() {
    const exams = await this.examRepository.getAll({}, {}, {projection: {answerKey: 0}});
    if (!exams) {
      throw new NotFoundException('Exams not found');
    }
    return exams;
  }

  async findOne(id: string) {
    const exam = await this.examRepository.getOne({ _id: id }, {}, {projection: {answerKey: 0}});
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }
    return exam;
  }

  async uploadModelAnswer(id: string, file: Express.Multer.File, modelAnswerDto: ModelAnswerDto) {

    const examExist = await this.examRepository.getOne({ _id: id });
    if (!examExist) {
      throw new NotFoundException('Exam not found');
    }

    // remove old answer sheet if exists
    if (examExist.answerSheetUrl && fs.existsSync(examExist.answerSheetUrl)) {
      fs.unlinkSync(examExist.answerSheetUrl);
    }
    
    // Save file to disk (exam folder with exam id)
    const folderPath = `./exams/${id}/answer-sheet`;
    const filePath = `${folderPath}/${file.filename}`;
    // Create exam folder if not exists
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Update file location from temp to exam folder
    fs.copyFileSync(file.path, filePath);
    // remove temp file
    fs.unlinkSync(file.path);

    // update exam with file path
    const exam = await this.examRepository.findOneAndUpdate({ _id: id }, { 
      answerSheetUrl: filePath,
      totalQuestions: modelAnswerDto.totalQuestions,
      totalMarks: modelAnswerDto.totalMarks,
     }, { new: true });
    
    return exam;
  }

}
