import { Controller, Post, Body, Get, Request } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {

    const result = await this.userService.create(createUserDto);
    return {
      message: 'User created successfully',
      data: result
    };
  }

  @Get('/profile')
  async getProfile(@Request() req: any) {
    console.log(req.user);
    const { password, ...user } = req.user;

    return {
      message: 'User retrieved successfully',
      data: user
    };
  }


  @Get()
  async getAllUsers() {
    const users = await this.userService.findAll();
    return {
      message: 'Users retrieved successfully',
      data: users
    };
  }

  @Post('/change-password')
  async changePassword(@Request() req: any, @Body() changePasswordDto: ChangePasswordDto){
    const result = await this.userService.changePassword(req.user._id, changePasswordDto);
    return {
      message: 'Password changed successfully',
      data: result
    };
  }

}
