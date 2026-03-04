import { UserRepository } from '@models/index';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { comparePassword } from '@utils/index';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {

  constructor( private readonly userRepository: UserRepository, private readonly jwtService: JwtService, private readonly configService: ConfigService) {}
  
  async login(loginDto: LoginDto) {
    // check on user name
    const userExists = await this.userRepository.getOne({ username: loginDto.username });
    
    // if user doesn't exist, throw exception
    if (!userExists) {
      throw new UnauthorizedException('invalid username');
    }
    
    // check if password is correct
    const isPasswordCorrect = await comparePassword(loginDto.password, userExists.password);

    if (!isPasswordCorrect) {
      throw new UnauthorizedException('invalid password');
    }

    // generate token
    const token = await this.jwtService.signAsync({ _id: userExists._id, username: userExists.username, role: userExists.role }, {
      secret: this.configService.get('jwt.secret'),
      expiresIn: '1h',
    });

    // return token
    return token;
  }

}

