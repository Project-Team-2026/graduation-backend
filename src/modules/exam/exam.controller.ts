import { Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from '@utils/index';
import { CreateExamDto } from './dto/create-exam.dto';
import { ModelAnswerDto } from './dto/model-answer.dto';
import { ExamService } from './exam.service';

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
 

  
  @Post(':id/model-answer')
  // upload file Interceptor(middleware)
  @UseInterceptors(FileInterceptor('model_answer', multerConfig))
  async uploadFile(
    @Param('id') id: string, 
    @UploadedFile() file: Express.Multer.File,
    @Body() modelAnswerDto: ModelAnswerDto
  ) {
    const exam = await this.examService.uploadModelAnswer(id, file, modelAnswerDto);
    return {
      message: 'Model answer uploaded successfully',
      data: exam,
    };
  }


}
