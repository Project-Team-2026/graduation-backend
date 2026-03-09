
import { ProcessingStatus, Tasks } from '@/common';
import { runPythonScript } from '@/utils';
import { AnswerSheetRepository } from '@models/index';
import { Process, Processor, InjectQueue } from '@nestjs/bull';
import type { Job, Queue } from 'bull';
import { Types } from 'mongoose';

@Processor(Tasks.PNG_CONVERTER)
export class PngCinverterProcessor {

    constructor( 
        private readonly answerSheetRepository: AnswerSheetRepository,
        @InjectQueue(Tasks.PREPROCESS) private readonly preprocessingQueue: Queue
    ) {
        
    }


    @Process(Tasks.PNG_CONVERTER)
    async handlePngCinverter(job: Job) {
        console.log('Processing PNG cinverter job:', job.data);
        const { filePath, answerSheetId, examId } = job.data;

        if (!filePath || !answerSheetId || !examId) {
            throw new Error('Missing required fields: filePath or answerSheetId or examId');
        }

        let result = await runPythonScript(Tasks.PNG_CONVERTER, filePath) as any;
        result = JSON.parse(result);

        if (!result.success) {
            throw new Error('Failed to convert PNG: ' + result.data);
        }

        // Update answer sheet with converted PNG path
        await this.answerSheetRepository.findOneAndUpdate({ _id: answerSheetId }, {
            filePath: result.data[0],
            processingStatus: ProcessingStatus.PROCESSING
        });

        // after converting all pages to png, send job to preprocessing processor 
        // (add job to preprocessing queue)
        this.preprocessingQueue.add(
            'run-preprocessing',
            {
                answerSheetId: answerSheetId,
                filePath: result.data[0]
            },
            {
                attempts: 3,
                backoff: 5000
            }
        )

        // if pdf has multiple pages, create multiple answer sheets
        if (result.data.length > 1) {
            for (let i = 1; i < result.data.length; i++) {

                // create new answer sheet for each page
                await this.answerSheetRepository.create({
                    examId: new Types.ObjectId(examId),
                    filePath: result.data[i],
                    processingStatus: ProcessingStatus.PROCESSING
                });


                // after converting all pages to png, send job to preprocessing processor 
                // (add job to preprocessing queue)
                this.preprocessingQueue.add(
                    'run-preprocessing',
                    {
                        answerSheetId: answerSheetId,
                        filePath: result.data[i]
                    },
                    {
                        attempts: 3,
                        backoff: 5000
                    }
                )
            }
        }


        
    }
}
