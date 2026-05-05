import { IsNumber, IsNotEmpty, IsArray, IsOptional, IsEnum, IsPositive, IsString } from "class-validator";
import { AnswerStatus } from "@common/index";
import { Type } from "class-transformer";


class AnswerDto {
    @IsNumber()
    @IsNotEmpty()
    @IsPositive()
    questionNumber: number;
    
    @IsOptional()
    @IsArray()
    @IsNotEmpty()
    @IsNumber({}, { each: true })
    answersIndex: number[];
    
    
}

export class UpdateAnswerSheetDto {

    @IsNotEmpty()
    @IsString()
    studentId: string;
    
    @IsArray()
    @IsNotEmpty()
    @Type(() => AnswerDto)
    answers: AnswerDto[];
}