import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { UserRole } from "../../common";
import { Types } from "mongoose";


@Schema({
    timestamps: true,
})
export class User {

    readonly _id: Types.ObjectId;

    @Prop({ type: String, required: true })
    username: string;
    
    @Prop({ type: String, required: true })
    password: string;
    
    @Prop({ type: String })
    email: string;
    
    @Prop({ type: Number, default: UserRole.USER, enum: UserRole })
    role: UserRole;

}


export const UserSchema = SchemaFactory.createForClass(User);