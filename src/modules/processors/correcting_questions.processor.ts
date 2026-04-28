import { Processor, Process } from "@nestjs/bull";
import { Tasks } from "@/common";
import type { Job } from "bull";

@Processor(Tasks.CORRECT_QUESTIONS)
export class CorrectingQuestionsProcessor {

    constructor() {}

    @Process(Tasks.CORRECT_QUESTIONS)
    async handleCorrectQuestions(job: Job) {
        console.log('Correcting questions processor');
    }
    
}