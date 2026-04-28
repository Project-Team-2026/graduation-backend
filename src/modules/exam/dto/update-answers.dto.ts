import { AnswerStatus } from "@common/index";
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsPositive } from "class-validator";

class AnswerDto {
    @IsNumber()
    @IsNotEmpty()
    @IsPositive()
    questionNumber: number;
    
    @IsArray()
    @IsNotEmpty()
    @IsNumber({}, { each: true })
    answersIndex: number[];
    
    @IsNotEmpty()
    @IsEnum(AnswerStatus)
    status: AnswerStatus;
}


export class UpdateAnswersDto {

    @IsArray()
    @IsNotEmpty()
    @Type(() => AnswerDto)
    answers: AnswerDto[];

    
}