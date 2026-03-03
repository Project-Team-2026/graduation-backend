import { ConflictException, Injectable } from '@nestjs/common';
import { CreateExamDto } from './dto/create-exam.dto';
import { ExamRepository } from 'src/models';


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
      throw new Error('Exams not found');
    }
    return exams;
  }

  async findOne(id: string) {
    const exam = await this.examRepository.getOne({ _id: id }, {}, {projection: {answerKey: 0}});
    if (!exam) {
      throw new Error('Exam not found');
    }
    return exam;
  }


}
