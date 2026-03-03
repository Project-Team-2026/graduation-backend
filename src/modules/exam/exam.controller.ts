import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ExamService } from './exam.service';
import { CreateExamDto } from './dto/create-exam.dto';

@Controller('exam')
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Post()
  async create(@Body() createExamDto: CreateExamDto) {
    const exam = await this.examService.create(createExamDto);
    return {
      message: 'Exam created successfully',
      data: exam,
    };
  }

  @Get()
  async findAll() {
    const exams =await this.examService.findAll();
    return {
      message: 'Exams fetched successfully',
      data: exams,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const exam =await this.examService.findOne( id);
    return {
      message: 'Exam fetched successfully',
      data: exam,
    };
  }


  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.examService.remove(+id);
  // }
}
