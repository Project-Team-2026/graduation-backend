import { IsNotEmpty, IsPositive, IsString, IsInt, MinLength, Max } from "class-validator";

export class CreateExamDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @MinLength(3, { message: 'Doctor name must be at least 3 characters long' })       
    @IsNotEmpty()
    doctorName: string;
    
    @IsString()
    @MinLength(2, { message: 'Department name must be at least 2 characters long' })
    @IsNotEmpty()
    department: string;

    @IsNotEmpty()
    @IsInt()
    @IsPositive({ message: 'Questions number must be a positive integer' })
    @Max(100, { message: 'Questions number must be less than or equal to 100' })
    questionsNumber: number;

    @IsNotEmpty()
    @IsInt()
    @IsPositive({ message: 'weight must be a positive integer' })
    weight: number;
}
