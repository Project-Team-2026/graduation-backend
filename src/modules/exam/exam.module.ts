import { Exam, ExamRepository, ExamSchema } from '@models/index';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExamController } from './exam.controller';
import { ExamService } from './exam.service';
import { ProcessingModule } from '../preprocess/processing.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Exam.name, schema: ExamSchema },
    ]),
    ProcessingModule
  ],
  controllers: [ExamController],
  providers: [ExamService,ExamRepository],
  exports: [ExamService,ExamRepository]
})
export class ExamModule {}
