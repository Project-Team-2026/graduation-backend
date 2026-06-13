import { IsString, IsNotEmpty, IsOptional, IsEnum } from "class-validator";
import { UserRole } from "@common/index";

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    username!: string;

    @IsString()
    @IsNotEmpty()
    password!: string;

    @IsEnum(UserRole)
    @IsOptional()
    role?: UserRole;
}
