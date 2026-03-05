import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateExamDto } from './dto/create-exam.dto';
import { ExamRepository } from '@models/index';
import * as fs from 'fs';
import { ModelAnswerDto } from './dto/model-answer.dto';
import { Types } from 'mongoose';
import { runPythonScript } from '@utils/index';
import { PythonTask } from '@common/enums';


@Injectable()
export class ExamService {

  constructor(private readonly examRepository: ExamRepository) { }

  async create(createExamDto: CreateExamDto, userId: string) {
    const examExist = await this.examRepository.getOne({ title: createExamDto.title, createdBy: new Types.ObjectId(userId) })
    if (examExist) {
      throw new ConflictException("Exam alredy exist")
    }
    return await this.examRepository.create({ title: createExamDto.title, createdBy: new Types.ObjectId(userId) });
  }


  async findAll(userId: string) {
    const exams = await this.examRepository.getAll({ createdBy: new Types.ObjectId(userId) }, {}, { projection: { answerKey: 0 } });
    if (!exams) {
      throw new NotFoundException('Exams not found');
    }
    return exams;
  }

  async findOne(id: string, userId: string) {
    const exam = await this.examRepository.getOne({ _id: id, createdBy: new Types.ObjectId(userId) }, {}, { projection: { answerKey: 0 } });
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }
    return exam;
  }

  async uploadModelAnswer(id: string, file: Express.Multer.File, modelAnswerDto: ModelAnswerDto, userId) {

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
    const filePath = `${folderPath}/model-answer.${file.originalname.split('.')[1]}`;
    // Create exam folder if not exists
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Update file location from temp to exam folder
    fs.copyFileSync(file.path, filePath);
    // remove temp file
    fs.unlinkSync(file.path);

    // pefor saving to db, convert pdf to png if pdf (python pdf converter)
    let result = await runPythonScript(PythonTask.PNG_CONVERTER, filePath) as any;
    result = JSON.parse(result);

    if (!result.success) {
      // delete the file if conversion failed
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw new BadRequestException("Failed to convert PDF to PNG: " + result.message);
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

    // update exam with file path
    const exam = await this.examRepository.findOneAndUpdate({ _id: id }, {
      answerSheetUrl: result.data[0],
      totalQuestions: modelAnswerDto.totalQuestions,
      totalMarks: modelAnswerDto.totalMarks,
    }, { new: true });

    return exam;
  }

}
