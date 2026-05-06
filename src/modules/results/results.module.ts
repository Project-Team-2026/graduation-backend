import { Module } from '@nestjs/common';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { AnswerSheet, AnswerSheetRepository, AnswerSheetSchema, ExamRepository, Exam, ExamSchema } from '@/models';
import { Mongoose } from 'mongoose';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Exam.name, schema: ExamSchema },
      { name: AnswerSheet.name, schema: AnswerSheetSchema}
    ])
  ],
  controllers: [ResultsController],
  providers: [ResultsService, AnswerSheetRepository, ExamRepository],
})
export class ResultsModule {}
