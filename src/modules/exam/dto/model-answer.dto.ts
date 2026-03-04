import { IsInt, IsNotEmpty, IsNumber, IsPositive, Max, Min } from "class-validator";
import { Transform } from "class-transformer";

export class ModelAnswerDto {

    @Transform(({ value }) => parseInt(value))
    @IsNumber()
    @IsNotEmpty()
    @IsPositive()
    @IsInt()
    @Min(1)
    @Max(100)
    totalQuestions: number;

    @Transform(({ value }) => parseInt(value))
    @IsNumber()
    @IsNotEmpty()
    @IsPositive()
    @IsInt()
    @Min(1)
    @Max(100)
    totalMarks: number;
    
}