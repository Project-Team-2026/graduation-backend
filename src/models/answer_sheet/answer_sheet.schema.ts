import { Schema, Prop, SchemaFactory } from "@nestjs/mongoose"
import  mongoose, { Types } from "mongoose"
import { ProcessingStatus, AnswerStatus } from "@common/index"
import { Exam } from "../exam/exam.schema"

@Schema()
export class Answer {

  @Prop({ type: Number, required: true })
  questionNumber: number

  @Prop({ type: [Number], default: [] })
  answersIndex: number[]  // 'A' = [0], 'B','C' = [1,2], none = []

  @Prop({ type: Number, required: true, enum: AnswerStatus, default: AnswerStatus.UNANSWERED })
  status: AnswerStatus  // ← بديل لـ conflict + isCorrect جزئياً

  @Prop({ type: Boolean, required: true, default: false })
  isCorrect: boolean  // بيتحسب بس لو status === ANSWERED

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

  @Prop({type: Boolean, default: false})
  idConflict: boolean

  @Prop({type: String, required: true})
  filePath: string

  @Prop({type: Number, required: true, enum: ProcessingStatus, default: ProcessingStatus.PENDING})
  status: ProcessingStatus // 0: PENDING, 1: PROCESSING, 2: DONE, 3: FAILED

  @Prop({type: Number, default: 0})
  score: number

  @Prop({type: [Answer]})
  answers: Answer[]

}

export const AnswerSheetSchema = SchemaFactory.createForClass(AnswerSheet)