import { Schema, Prop, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";
import { AnswerStatus, ProcessingStatus } from "@common/index";
import { User } from "../user/user.schema";

@Schema()
export class AnswerKey {

  @Prop({ type: Number, required: true })
  questionNumber: number

  @Prop({ type: [Number], default: [] })
  answersIndex: number[]  // 'A' = [0], 'B','C' = [1,2], none = []

  @Prop({ type: Number, required: true, enum: AnswerStatus, default: AnswerStatus.UNANSWERED })
  status: AnswerStatus  // ← بديل لـ conflict + isCorrect جزئياً

  @Prop({ type: Number, default: 1 })
  weight: number

}

@Schema({
    timestamps: true,
})
export class Exam {


  readonly _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name })
  createdBy: Types.ObjectId;

  @Prop({ type: String, required: true })
  title: string;
  
  @Prop({ type: Number })
  totalQuestions: number;
  
  @Prop({ type: Number })
  totalMarks: number;

  @Prop({ type: String })
  answerSheetUrl: string

  @Prop({ type: Number, default: ProcessingStatus.PENDING })
  processingStatus: ProcessingStatus

  @Prop({ type: String })
  doctorName: string

  @Prop({ type: String })
  department: string

  @Prop({ type: [AnswerKey] })
  answerKey: AnswerKey[];


}

export const ExamSchema = SchemaFactory.createForClass(Exam);

