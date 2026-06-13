import { UserRepository } from '@models/index';
import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { comparePassword, hashPassword } from '@utils/index';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {

  constructor( private readonly userRepository: UserRepository) {}

  async create(createUserDto: CreateUserDto) {
    // check if user already exists
    const userExists = await this.userRepository.getOne({ username: createUserDto.username });
    if (userExists) {
      throw new ConflictException('User already exists');
    }

    // hash password
    const hashedPassword = await hashPassword(createUserDto.password);
    createUserDto.password = hashedPassword;
    
    // create user
    const createdUser = await this.userRepository.create(createUserDto);
    const { password, ...user } = createdUser.toObject();

    return user;
  }


  async findAll() {
    const users = await this.userRepository.getAll({}, { password: 0 });
    if (!users) {
      throw new NotFoundException('Users not found');
    }

    return users;
  }

  async toggleStatus(id: string, isActive: boolean) {
    const user = await this.userRepository.findOneAndUpdate({ _id: id }, { isActive }, { new: true, projection: { password: 0 } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }


  async changePassword(id: string, changePasswordDto: ChangePasswordDto){
    const { oldPassword, newPassword } = changePasswordDto;
    const user = await this.userRepository.getOne({ _id: id });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const isPasswordMatch = await comparePassword(oldPassword, user.password);
    if (!isPasswordMatch) {
      throw new UnauthorizedException('Invalid password');
    }

    if (oldPassword === newPassword) {
      throw new BadRequestException('New password must be different from current password');
    }


    const hashedPassword = await hashPassword(newPassword);
    
    const updatedUser = await this.userRepository.findOneAndUpdate({ _id: id }, { password: hashedPassword }, { new: true, projection: { password: 0 } });
    return updatedUser;
  
    
    
  }

}
