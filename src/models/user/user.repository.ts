import { Injectable } from "@nestjs/common";
import { AbstractRepository } from "../abstract.repository";
import { User } from "./user.schema";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";

@Injectable()
export class UserRepository extends AbstractRepository<User> {
    constructor( @InjectModel(User.name) protected readonly userModel: Model<User>) {
        super(userModel);
    }
}
