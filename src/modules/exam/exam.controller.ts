import { Controller, Get, Post, Body, Patch, Param, UseInterceptors, UploadedFile, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ExamService } from './exam.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig, generateExcel } from '@utils/index';
import { UpdateAnswersDto } from './dto';

@Controller('exam')
export class ExamController {
  constructor(private readonly examService: ExamService) { }

  @Post()
  async create(@Body() createExamDto: CreateExamDto, @Req() req: any) {
    const exam = await this.examService.create(createExamDto, req.user._id);
    return {
      message: 'Exam created successfully',
      data: exam,
    };
  }

  @Get()
  async findAll(@Req() req: any) {
    console.log(`[ExamController] Request received for findAll. req.user:`, req.user);
    const userId = req.user?._id;
    const exams = await this.examService.findAll(userId);
    return {
      message: 'Exams fetched successfully',
      data: exams,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const exam = await this.examService.findOne(id, req.user._id);
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
  ) {
    const exam = await this.examService.uploadModelAnswer(id, file, req.user._id);
    return {
      message: 'Model answer uploaded successfully',
      data: exam,
    };
  }

  @Patch(':id/answers')
  async updateAnswers(@Param('id') id: string, @Body() updateAnswersDto: UpdateAnswersDto, @Req() req: any) {
    const exam = await this.examService.updateAnswers(id, updateAnswersDto, req.user._id);
    return {
      message: 'Answers updated successfully',
      data: exam,
    };
  }

  @Patch(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    const exam = await this.examService.deleteModelAnswer(id, req.user._id);
    return {
      message: 'Model answer deleted successfully',
      data: exam,
    };
  }

}