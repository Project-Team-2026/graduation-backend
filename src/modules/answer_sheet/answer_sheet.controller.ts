import { Controller, Param, Post, UploadedFiles, UseInterceptors, Req, Get } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AnswerSheetService } from './answer_sheet.service';
import { multerConfig } from '@utils/index';


@Controller('answer-sheet')
export class AnswerSheetController {
  constructor(private readonly answerSheetService: AnswerSheetService) {}

  // upload answer sheets
  @Post(':examId')
  @UseInterceptors(FilesInterceptor('files', 500, multerConfig))
  async uploadAnswerSheets(
    @Req() req: any,
    @Param('examId') examId: string, 
    @UploadedFiles() files: Array<Express.Multer.File>) {
    const userId = req.user._id;
    const result = await this.answerSheetService.uploadAnswerSheets(examId, files, userId);
    return {message: 'Answer sheets uploaded successfully', result};
  }

  // get answer sheets
  @Get(':examId')
  async getAnswerSheets(
    @Req() req: any,
    @Param('examId') examId: string
  ) {
    const userId = req.user._id;
    const result = await this.answerSheetService.getAnswerSheets(examId, userId);
    return {message: 'Answer sheets retrieved successfully', result};
  }

  // re-correct answer sheet
  @Post(':Id/recorrect')
  async reCorrectAnswerSheet(
    @Req() req: any,
    @Param('Id') Id: string
  ) {
    const userId = req.user._id;
    const result = await this.answerSheetService.reCorrectAnswerSheet(Id, userId);
    return {message: 'Answer sheets re-corrected successfully', result};
  }

  // re-correct all answer sheets for a specific exam
  @Post(':examId/recorrect-all')
  async reCorrectAllAnswerSheets(
    @Req() req: any,
    @Param('examId') examId: string
  ) {
    const userId = req.user._id;
    const result = await this.answerSheetService.reCorrectAllSheets(examId, userId);
    return {message: 'Answer sheets re-corrected successfully', result};
  }

}
