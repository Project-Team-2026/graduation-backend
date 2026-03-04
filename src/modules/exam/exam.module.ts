import { Module } from '@nestjs/common';
import { ExamService } from './exam.service';
import { ExamController } from './exam.controller';
import { ExamRepository } from 'src/models';
import { MongooseModule } from '@nestjs/mongoose';
import { ExamSchema,Exam } from 'src/models';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Exam.name, schema: ExamSchema },
    ]),
  ],
  controllers: [ExamController],
  providers: [ExamService,ExamRepository],
  exports: [ExamService,ExamRepository]
})
export class ExamModule {}
