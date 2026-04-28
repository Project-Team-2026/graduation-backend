import { AnswerSheetRepository, ExamRepository } from '@/models';
import { AnswerSheetSchema, ExamSchema } from '@models/index';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PreprocessingProcessor } from './preprocessing.processor';
import { Tasks } from '@/common';
import { PngCinverterProcessor } from './png_cinverter.processor';
import { DetectIdProcessor } from './detect_Id.processor';
import { DetectAnswerProcessor } from './detect_answer.processor';
import { CorrectingQuestionsProcessor } from './correcting_questions.processor';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Exam', schema: ExamSchema },
      { name: 'AnswerSheet', schema: AnswerSheetSchema },
    ]),
    BullModule.registerQueue(
      { name: Tasks.PNG_CONVERTER },
      { name: Tasks.PREPROCESS },
      { name: Tasks.DETECT_ID },
      { name: Tasks.DETECT_ANSWER },
      { name: Tasks.CORRECT_QUESTIONS },
    )
  ],
  providers: [
    PreprocessingProcessor,
    PngCinverterProcessor,
    DetectIdProcessor,
    DetectAnswerProcessor,
    CorrectingQuestionsProcessor,
    ExamRepository,
    AnswerSheetRepository
  ],
  exports: [BullModule]
})
export class ProcessingModule {}