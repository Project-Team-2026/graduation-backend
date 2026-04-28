
import { ProcessingStatus, Tasks } from "@/common";
import { AnswerSheetRepository, ExamRepository } from "@/models";
import { runPythonScript } from "@/utils";
import { Process, Processor, InjectQueue } from "@nestjs/bull";
import type { Job, Queue } from "bull";

@Processor(Tasks.DETECT_ID)
export class DetectIdProcessor {

    constructor( 
        private readonly answerSheetRepository: AnswerSheetRepository,
        private readonly examRepository: ExamRepository,
        @InjectQueue(Tasks.DETECT_ANSWER) private readonly detectAnswerQueue: Queue
    ) {}

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
        
        const exam = await this.examRepository.getOne({ _id: sheet.examId });
        const q_no = exam?.totalQuestions || 0;
        // TODO: add detect answer job
        await this.detectAnswerQueue.add(Tasks.DETECT_ANSWER, {
            answerSheetId,
            filePath,
            q_no
        });
        
        // For now, just log the file path
        console.log(` ID: ${data.student_id}, Warning: ${data.warning}, for file: ${filePath}`);

    }
    
}