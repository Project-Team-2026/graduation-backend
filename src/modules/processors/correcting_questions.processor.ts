import { Processor, Process } from "@nestjs/bull";
import {  Tasks } from "@/common";
import type { Job } from "bull";
import { AnswerSheetRepository, Exam, ExamRepository } from "@/models/index";
import { AnswerStatus, ProcessingStatus } from "@/common/index";
import { Types } from "mongoose";

@Processor(Tasks.CORRECT_QUESTIONS)
export class CorrectingQuestionsProcessor {

    constructor(
        private readonly answerSheetRepository: AnswerSheetRepository,
        private readonly examRepository: ExamRepository
    ) {}

    @Process(Tasks.CORRECT_QUESTIONS)
    async handleCorrectQuestions(job: Job) {
        const { answerSheetId } = job.data;
        if (!answerSheetId) {
            console.log('Answer sheet ID is required');
            return;
        }
        // TODO: Implement question correction logic
        // find answer sheet by ID, and populate exam
        let answerSheet = await this.answerSheetRepository.getOne({ _id: new Types.ObjectId(answerSheetId) });
        if (!answerSheet) {
            console.log(`Answer sheet with ID ${answerSheetId} not found`);
            return;
        }
        if (answerSheet.processinStatus !== ProcessingStatus.DONE && answerSheet.processinStatus !== ProcessingStatus.ANSWERS_DETECTED) {
            console.log(`Answer sheet with ID ${answerSheetId} is not in answers detected yet`);
            return;
        }

        const exam = await this.examRepository.getOne({ _id: answerSheet.examId });
        if(!exam) {
            // update answer sheet status to failed
            await this.answerSheetRepository.findOneAndUpdate({ _id: answerSheetId }, { processinStatus: ProcessingStatus.FAILED });
            console.log(`Exam with ID ${answerSheet.examId} not found`);
            return;
        }

        // Initialize score
        answerSheet.score = 0;

        for (const answer of answerSheet.answers) {
            const modeAnswer = exam.answerKey.find((a) => a.questionNumber === answer.questionNumber);
            
            if (!modeAnswer) {
                console.log(`Answer key with question number ${answer.questionNumber} not found`);
                return;
            }

            if(answer.status === AnswerStatus.ANSWERED) {
                // check if all answers are correct
                const isCorrect = answer.answersIndex.every((index) => modeAnswer.answersIndex.includes(index));
    
                answer.isCorrect = isCorrect;
                answerSheet.score += isCorrect ? (modeAnswer.weight || 1) : 0;
            }

        }


        // update answer sheet with new score and status
        await this.answerSheetRepository.findOneAndUpdate(
            { _id: answerSheetId }, 
            { 
                score: answerSheet.score,
                answers: answerSheet.answers, 
                processinStatus: ProcessingStatus.DONE,
            }
        );
        
        console.log( 'answerSheet correction completed  ');
        

    }
    
}