import { Module } from '@nestjs/common';
import { AnswerSheetService } from './answer_sheet.service';
import { AnswerSheetController } from './answer_sheet.controller';
import { AnswerSheetRepository, AnswerSheetSchema } from 'src/models';
import { MongooseModule } from '@nestjs/mongoose';
import { ExamModule } from '../exam/exam.module';

@Module({
  imports: [
    ExamModule,
    MongooseModule.forFeature([{ name: 'AnswerSheet', schema: AnswerSheetSchema }])
  ],
  controllers: [AnswerSheetController],
  providers: [AnswerSheetService, AnswerSheetRepository],
})
export class AnswerSheetModule {}
