import { IsArray, IsNumber, IsNotEmpty, IsPositive } from "class-validator";

export class UpdateAnswersDto {

    @IsNumber()
    @IsNotEmpty()
    @IsPositive()
    questionNumber: number;

    @IsArray()
    @IsNotEmpty()
    @IsNumber({}, { each: true })
    answer: [number];
    
}