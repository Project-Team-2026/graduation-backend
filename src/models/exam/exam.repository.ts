

import { Model } from "mongoose";
import { AbstractRepository } from "../abstract.repository";
import { Exam } from "./exam.schema";
import { InjectModel } from "@nestjs/mongoose";
import { Injectable } from "@nestjs/common";

@Injectable()
export class ExamRepository extends AbstractRepository<Exam> {
    constructor( @InjectModel(Exam.name) protected readonly examModel: Model<Exam>) {
        super(examModel);
    }
}
