import { Schema, Prop, SchemaFactory } from "@nestjs/mongoose";
import { ObjectId, Types } from "mongoose";


@Schema()
export class AnswerKey {
  @Prop({ type: Number })
  questionNumber: number;
  
  @Prop({ type: Boolean })
  correctAnswer: boolean;
}

@Schema({
    timestamps: true,
})
export class Exam {


  readonly _id: Types.ObjectId;

  @Prop({ type: String, required: true })
  title: string;
  
  @Prop({ type: Number })
  totalQuestions: number;
  
  @Prop({ type: Number })
  totalMarks: number;
  
  @Prop({ type: Number })
  passingMark: number;

  @Prop({ type: [AnswerKey] })
  answerKey: AnswerKey[];


}

export const ExamSchema = SchemaFactory.createForClass(Exam);

