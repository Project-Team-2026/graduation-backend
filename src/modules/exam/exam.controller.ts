import { Body, Controller, Get, Param, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from '@utils/index';
import { CreateExamDto } from './dto/create-exam.dto';
import { ModelAnswerDto } from './dto/model-answer.dto';
import { ExamService } from './exam.service';

@Controller('exam')
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Post()
  async create(@Req() req: any, @Body() createExamDto: CreateExamDto) {
    const userId = req.user._id; // Get from auth
    const exam = await this.examService.create(createExamDto, userId);

    return {
      message: 'Exam created successfully',
      data: exam,
    };
  }

  @Get()
  async findAll(@Req() req: any) {
    const userId = req.user._id; // Get from auth
    const exams =await this.examService.findAll(userId);
    return {
      message: 'Exams fetched successfully',
      data: exams,
    };
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const userId = req.user._id; // Get from auth
    const exam =await this.examService.findOne(id, userId);
    return {
      message: 'Exam fetched successfully',
      data: exam,
    };
  }
 

  
  @Post(':id/model-answer')
  // upload file Interceptor(middleware)
  @UseInterceptors(FileInterceptor('model_answer', multerConfig))
  async uploadFile(
    @Req() req: any,
    @Param('id') id: string, 
    @UploadedFile() file: Express.Multer.File,
    @Body() modelAnswerDto: ModelAnswerDto
  ) {
    const userId = req.user._id; // Get from auth
    const exam = await this.examService.uploadModelAnswer(id, file, modelAnswerDto, userId);
    return {
      message: 'Model answer uploaded successfully',
      data: exam,
    };
  }


}
