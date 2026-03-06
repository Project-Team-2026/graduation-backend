import { Module } from '@nestjs/common';
import { AnswerSheetService } from './answer_sheet.service';
import { AnswerSheetController } from './answer_sheet.controller';
import { AnswerSheetRepository, AnswerSheetSchema } from '@models/index';
import { MongooseModule } from '@nestjs/mongoose';
import { ExamModule } from '../exam/exam.module';
import { ProcessingModule } from '../preprocess/processing.module';

@Module({
  imports: [
    ExamModule,
    MongooseModule.forFeature([{ name: 'AnswerSheet', schema: AnswerSheetSchema }]),
    ProcessingModule
  ],
  controllers: [AnswerSheetController],
  providers: [AnswerSheetService, AnswerSheetRepository],
  exports: [AnswerSheetService, AnswerSheetRepository]
})
export class AnswerSheetModule {}
