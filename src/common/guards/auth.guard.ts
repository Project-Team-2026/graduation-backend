import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private readonly configService: ConfigService,
    private reflector: Reflector,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization;
    if (!token) {
      throw new UnauthorizedException("Unauthorized: Token not found");
    }
    try {
      // 💡 Here the JWT secret key that's used for verifying the payload 
      // is the key that was passsed in the JwtModule
      const { iat, exp, ...user } = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get("jwt").secret,
      });

      console.log(`[AuthGuard] Token verified. User: ${user.username}, ID: ${user._id}, method: ${request.method}, url: ${request.url}`);
      // 💡 We're assigning the payload to the request object here
      // so that we can access it in our route handlers
      request.user = user;
    } catch (e) {
      console.error(`[AuthGuard] Token verification failed: ${e.message}`);
      throw new UnauthorizedException("Unauthorized: Invalid token");
    }
    return true;
  }

}