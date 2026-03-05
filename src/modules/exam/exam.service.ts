import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateExamDto } from './dto/create-exam.dto';
import { ExamRepository } from '@models/index';
import * as fs from 'fs';
import { ModelAnswerDto } from './dto/model-answer.dto';
import { Types } from 'mongoose';


@Injectable()
export class ExamService {

  constructor(private readonly examRepository: ExamRepository) {}

  async create(createExamDto: CreateExamDto, userId: string) {
    const examExist = await this.examRepository.getOne({title: createExamDto.title, createdBy: userId})
    if(examExist){
      throw new ConflictException("Exam alredy exist")
    }
    return await this.examRepository.create({title: createExamDto.title, createdBy: new Types.ObjectId(userId)});
  }


  async findAll(userId: string) {
    const exams = await this.examRepository.getAll({createdBy: new Types.ObjectId(userId)}, {}, {projection: {answerKey: 0}});
    if (!exams) {
      throw new NotFoundException('Exams not found');
    }
    return exams;
  }

  async findOne(id: string, userId: string) {
    const exam = await this.examRepository.getOne({ _id: id, createdBy: new Types.ObjectId(userId) }, {}, {projection: {answerKey: 0}});
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
    const folderPath = `./exams/${id}`;
    const filePath = `${folderPath}/model-answer.${file.originalname.split('.')[1]}`;
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
