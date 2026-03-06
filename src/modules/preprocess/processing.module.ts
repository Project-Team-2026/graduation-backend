import { AnswerSheetRepository, ExamRepository } from '@/models';
import { AnswerSheetSchema, ExamSchema } from '@models/index';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PreprocessingProcessor } from './preprocessing.processor';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Exam', schema: ExamSchema },
      { name: 'AnswerSheet', schema: AnswerSheetSchema },
    ]),
    BullModule.registerQueue({
      name: 'preprocessing',
    })
  ],
  providers: [PreprocessingProcessor, ExamRepository, AnswerSheetRepository],
  exports: [BullModule]
})
export class ProcessingModule {}