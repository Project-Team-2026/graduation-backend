import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRepository } from '../../models';
import { LoginDto } from './dto/login.dto';
import { comparePassword } from '../../utils';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {

  constructor(private readonly userRepository: UserRepository, private readonly jwtService: JwtService, private readonly configService: ConfigService) { }

  async login(loginDto: LoginDto) {
    console.log(`[AuthService] Login attempt for username: "${loginDto.username}"`);

    // check on user name
    const userExists = await this.userRepository.getOne({ username: loginDto.username });

    if (!userExists) {
      console.log(`[AuthService] No user found with username: "${loginDto.username}"`);
      throw new UnauthorizedException('invalid username');
    }

    console.log(`[AuthService] User found: ${userExists.username} (ID: ${userExists._id})`);

    // check if password is correct
    const isPasswordCorrect = await comparePassword(loginDto.password, userExists.password);

    if (!isPasswordCorrect) {
      console.log(`[AuthService] Incorrect password for user: "${loginDto.username}"`);
      throw new UnauthorizedException('invalid password');
    }

    // generate token
    const payload = {
      _id: userExists._id.toString(),
      username: userExists.username,
      role: userExists.role
    };

    console.log(`[AuthService] Generating token with payload:`, payload);

    const token = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('jwt.secret'),
      expiresIn: '1h',
    });

    console.log(`[AuthService] Token generated successfully for user: ${userExists.username}`);
    return token;
  }

}