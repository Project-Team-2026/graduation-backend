import { AnswerSheet } from "./answer_sheet.schema";
import { AbstractRepository } from "../abstract.repository";
import { Model } from "mongoose";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";


@Injectable()
export class AnswerSheetRepository extends AbstractRepository<AnswerSheet> {
    constructor( @InjectModel(AnswerSheet.name) protected readonly answerSheetModel: Model<AnswerSheet> ) {
        super(answerSheetModel);
    }
}
