import { AnswerStatus, BubbleState, Tasks, ProcessingStatus } from "@/common";
import { AnswerSheetRepository } from "@/models";
import { runPythonScript } from "@/utils";
import { InjectQueue, Process, Processor } from "@nestjs/bull";
import type { Job, Queue } from "bull";

@Processor(Tasks.DETECT_ANSWER)
export class DetectAnswerProcessor {

    constructor( 
        private readonly answerSheetRepository: AnswerSheetRepository,
        @InjectQueue(Tasks.CORRECT_QUESTIONS) private readonly correctQuestionsQueue: Queue
    ) {}

    @Process(Tasks.DETECT_ANSWER)
    async handleDetectAnswer(job: Job) {

        const { answerSheetId, filePath, q_no } = job.data;
        let choices: any[] = [];
        // Implement answer detection logic here(python script)
        let result = await runPythonScript(Tasks.DETECT_ANSWER, filePath, q_no) as any;
        const { data } = JSON.parse(result);

        for (let i = 0; i < data.length; i++) {
            const question = data[i];
            let status = AnswerStatus.UNANSWERED;
            let answersIndex: number[] = [];    

            // Get indices of filled bubbles (value = 2)
            question.forEach((bubble: any, index: number) => {
                if (bubble === BubbleState.FILLED) {
                    answersIndex.push(index);
                }
            });

            // Check for ambiguous bubbles (value = 0)
            const hasAmbiguous = question.some((bubble: any) => bubble === BubbleState.AMBIGUOUS);
            
            if (hasAmbiguous) {
                status = AnswerStatus.AMBIGUOUS;
            } else if (answersIndex.length === 0) {
                status = AnswerStatus.UNANSWERED;
            } else if (answersIndex.length > 1) {
                status = AnswerStatus.MULTIPLE;
            } else {
                status = AnswerStatus.ANSWERED;
            }

            choices.push({ questionNumber: i+1, answersIndex, status });
        }
        
        // Convert choices object to answers array
        const answers = choices.map((choice) => ({
            questionNumber: choice.questionNumber,
            answersIndex: choice.answersIndex,
            status: choice.status,
            isCorrect: false // Will be calculated later during grading
        }));

        // Update database with answers
        await this.answerSheetRepository.findOneAndUpdate(
            { _id: answerSheetId }, 
            { 
                answers: answers,
                status: ProcessingStatus.ANSWERS_DETECTED
            }
        );

        // TODO: add correct questions job to queue
        this.correctQuestionsQueue.add(
            Tasks.CORRECT_QUESTIONS,
            { answerSheetId }
        );



    }
}