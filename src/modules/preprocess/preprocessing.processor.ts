import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { type Job } from 'bull';
import { runPythonScript } from '@/utils';
import { ProcessingStatus, Tasks } from '@/common';
import { ExamRepository, AnswerSheetRepository } from '@models/index';

@Processor(Tasks.PREPROCESS)
export class PreprocessingProcessor {

  constructor(
    private readonly examRepository: ExamRepository,
    private readonly answerSheetRepository: AnswerSheetRepository,
  ) {}

  @Process('run-preprocessing')
  async handlePreprocessing(job: Job) {

    const { examId, answerSheetId, filePath } = job.data;
    console.log('Starting preprocessing job:', job.data);

    if(examId) {
      await this.examRepository.findOneAndUpdate({ _id: examId }, { processingStatus: ProcessingStatus.PROCESSING });
    }else if(answerSheetId) {
      await this.answerSheetRepository.findOneAndUpdate({ _id: answerSheetId }, { processingStatus: ProcessingStatus.PROCESSING });
    }

    let result = await runPythonScript(
      Tasks.PREPROCESS,
      filePath,
    ) as any;
    result = JSON.parse(result);

    // if failed throw error and retry processing
    if(!result.success) {
      throw new Error(result.data);
    }


    // update processing status
    if(examId) {
      await this.examRepository.findOneAndUpdate({ _id: examId }, { processingStatus: ProcessingStatus.PREPROCESSED });
      //TODO: if exam add to detect answer Queue
    }else if(answerSheetId) {
      await this.answerSheetRepository.findOneAndUpdate({ _id: answerSheetId }, { processingStatus: ProcessingStatus.PREPROCESSED });
      //TODO: if answer sheet add to detectId Queue
      //TODO: if answer sheet add to detect answer Queue
    }

    console.log('Preprocessing job completed');
    return result;
  }


  @OnQueueFailed()
  async handleFailed(job: Job, error: Error) {
    console.log('Failed job:', job.data, error);
    
    const { examId, answerSheetId } = job.data;

    if(examId) {
      await this.examRepository.findOneAndUpdate({ _id: examId }, { processingStatus: ProcessingStatus.FAILED });
    }else if(answerSheetId) {
      await this.answerSheetRepository.findOneAndUpdate({ _id: answerSheetId }, { processingStatus: ProcessingStatus.FAILED });
    }
  }
}