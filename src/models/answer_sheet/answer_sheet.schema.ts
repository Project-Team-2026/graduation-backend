import { Schema, Prop, SchemaFactory } from "@nestjs/mongoose"
import  mongoose, { Types } from "mongoose"
import { ProcessingStatus } from "@common/index"
import { Exam } from "../exam/exam.schema"

@Schema()
export class Answer {
    
  @Prop({type: Number, required: true})
  questionNumber: number
  
  @Prop({type: [String], required: true})
  selectedAnswer: string[]
  
  @Prop({type: Boolean, required: true})
  isCorrect: boolean
}

@Schema({
    timestamps: true
})
export class AnswerSheet {

    
  readonly _id: Types.ObjectId;

  @Prop({type: Types.ObjectId, ref: Exam.name})
  examId: Types.ObjectId

  @Prop({type: String})
  studentId: string

  @Prop({type: String, required: true})
  filePath: string

  @Prop({type: Number, required: true, enum: ProcessingStatus, default: ProcessingStatus.PENDING})
  processingStatus: ProcessingStatus // 0: PENDING, 1: PROCESSING, 2: DONE, 3: FAILED

  @Prop({type: Number})
  score: number

  @Prop({type: [Answer]})
  answers: Answer[]

}

export const AnswerSheetSchema = SchemaFactory.createForClass(AnswerSheet)