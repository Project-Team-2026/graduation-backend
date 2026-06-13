import { Controller, Post, Body, Get, Request, UseGuards, Patch, Param } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthGuard, RolesGuard } from '@common/guards';
import { Roles } from '@common/decorators';
import { UserRole } from '@common/enums';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() createUserDto: CreateUserDto) {
    const result = await this.userService.create(createUserDto);
    return {
      message: 'User created successfully',
      data: result
    };
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  async getProfile(@Request() req: any) {
    console.log(req.user);
    const { password, ...user } = req.user;

    return {
      message: 'User retrieved successfully',
      data: user
    };
  }


  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllUsers() {
    const users = await this.userService.findAll();
    return {
      message: 'Users retrieved successfully',
      data: users
    };
  }

  @Patch(':id/toggle-status')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async toggleStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    const result = await this.userService.toggleStatus(id, isActive);
    return {
      message: `User ${isActive ? 'enabled' : 'disabled'} successfully`,
      data: result
    };
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
  async changePassword(@Request() req: any, @Body() changePasswordDto: ChangePasswordDto){
    const result = await this.userService.changePassword(req.user._id, changePasswordDto);
    return {
      message: 'Password changed successfully',
      data: result
    };
  }

}
