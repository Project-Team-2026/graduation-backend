import { Processor, Process } from '@nestjs/bull';
import { type Job } from 'bull';
import { runPythonScript } from '@/utils';
import { ProcessingStatus, PythonTask } from '@/common';
import { ExamRepository, AnswerSheetRepository } from '@models/index';

@Processor('preprocessing')
export class PreprocessingProcessor {

  constructor(
    private readonly examRepository: ExamRepository,
    private readonly answerSheetRepository: AnswerSheetRepository,
  ) {}

  @Process('run-preprocessing')
  async handlePreprocessing(job: Job) {

    const { examId, answerSheetId, filePath } = job.data;
    console.log('Processing job:', job.data);

    if(examId) {
      await this.examRepository.findOneAndUpdate({ _id: examId }, { processingStatus: ProcessingStatus.PROCESSING });
    }else if(answerSheetId) {
      await this.answerSheetRepository.findOneAndUpdate({ _id: answerSheetId }, { processingStatus: ProcessingStatus.PROCESSING });
    }

    const result = await runPythonScript(
      PythonTask.PREPROCESS,
      filePath,
    );

    return result;
  }
}