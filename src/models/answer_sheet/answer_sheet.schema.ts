import { Schema, Prop, SchemaFactory } from "@nestjs/mongoose"
import  mongoose, { Types } from "mongoose"
import { ProcessingStatus } from "src/common"

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

  @Prop({type: Types.ObjectId, ref: 'Exam'})
  examId: mongoose.ObjectId

  @Prop({type: String, required: true})
  studentId: string

  @Prop({type: String, required: true})
  imagePath: string

  @Prop({type: Number, required: true, enum: ProcessingStatus, default: ProcessingStatus.PENDING})
  processingStatus: ProcessingStatus // 0: PENDING, 1: PROCESSING, 2: DONE, 3: FAILED

  @Prop({type: Number, required: true})
  score: number

  @Prop({type: [Answer], required: true})
  answers: Answer[]

}

export const AnswerSheetSchema = SchemaFactory.createForClass(AnswerSheet)