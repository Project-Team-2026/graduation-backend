
import { ProcessingStatus, Tasks } from '@/common';
import { Processor, Process } from '@nestjs/bull';
import type { Job } from 'bull';
import { AnswerSheetRepository } from '@models/index';
import { runPythonScript } from '@/utils';
import { Types } from 'mongoose';

@Processor(Tasks.PNG_CONVERTER)
export class PngCinverterProcessor {

    constructor( private readonly answerSheetRepository: AnswerSheetRepository) {
        
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
            throw new Error('Failed to convert PNG: ' + result.message);
        }

        // Update answer sheet with converted PNG path
        await this.answerSheetRepository.findOneAndUpdate({ _id: answerSheetId }, {
            filePath: result.data[0],
            processingStatus: ProcessingStatus.PROCESSING
        });

        // if pdf has multiple pages, create multiple answer sheets
        if (result.data.length > 1) {
            for (let i = 1; i < result.data.length; i++) {
                await this.answerSheetRepository.create({
                    examId: new Types.ObjectId(examId),
                    filePath: result.data[i],
                    processingStatus: ProcessingStatus.PROCESSING
                });
            }
        }


        
    }
}
