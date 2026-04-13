
import { ProcessingStatus, Tasks } from "@/common";
import { AnswerSheetRepository } from "@/models";
import { runPythonScript } from "@/utils";
import { Process, Processor } from "@nestjs/bull";
import type { Job } from "bull";

@Processor(Tasks.DETECT_ID)
export class DetectIdProcessor {

    constructor( private readonly answerSheetRepository: AnswerSheetRepository) {}

    @Process(Tasks.DETECT_ID)
    async handleDetectId(job: Job) {

        const { answerSheetId, filePath } = job.data;

        // Implement ID detection logic here(python script)
        let result = await runPythonScript(Tasks.DETECT_ID, filePath) as any;
        const { data } = JSON.parse(result);


        // update DB document
        const sheet = await this.answerSheetRepository.findOneAndUpdate(
            { _id: answerSheetId },
            { studentId: data.student_id, idConflict: data.warning , processingStatus: ProcessingStatus.ID_DETECTED }
        );

        if (!sheet) {
            throw new Error(`Answer sheet ${answerSheetId} not found`);
        }
        
        // TODO: add detect answer job

        // For now, just log the file path
        console.log(`Detecting ID from file: ${filePath}`);

    }
    
}