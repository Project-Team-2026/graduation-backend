import { Controller, Param, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AnswerSheetService } from './answer_sheet.service';
import { multerConfig } from 'src/utils';


@Controller('answer-sheet')
export class AnswerSheetController {
  constructor(private readonly answerSheetService: AnswerSheetService) {}

  // upload answer sheets
  @Post(':examId')
  @UseInterceptors(FilesInterceptor('files', 500, multerConfig))
  async uploadAnswerSheets(@Param('examId') examId: string, @UploadedFiles() files: Array<Express.Multer.File>) {
    const result = await this.answerSheetService.uploadAnswerSheets(examId, files);
    return {message: 'Answer sheets uploaded successfully', result};
  }

}
