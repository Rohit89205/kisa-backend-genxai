import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../service/jwt.service';
import { User } from '../../auth/models/user.model';
import { UserSession } from '../../auth/models/user_session.model';
import { InjectModel } from '@nestjs/sequelize';
import { ResponseHelper } from '../helper/response.helper';
import { encodeValue } from '../helper/crypto.helper';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly tokenService: TokenService,
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(UserSession) private readonly userSessionModel: typeof UserSession,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.substring(7);
    try {
      const payload = this.tokenService.verifyToken(token);
      console.log('AuthMiddleware: Finding user');
      const userData = await this.userModel.findOne({
        where: { id: payload.id },
      });
      console.log('AuthMiddleware: User found', !!userData);
      if (!userData) {
        console.log('AuthMiddleware: User not found');
        throw new UnauthorizedException('User not found');
      }
      console.log('AuthMiddleware: Finding user session');
      const userSession = await this.userSessionModel.findOne({
        where: {
          user_id: payload.id,
          access_token: token,
        },
        raw: true,
      });
      console.log('AuthMiddleware: Session found', userSession);
      if (!userSession) {
        console.log('AuthMiddleware: Session not found');
        throw new UnauthorizedException('You are Unauthorized');
      }
      (req as any).user = payload; // Attach user to request
      console.log('AuthMiddleware: Success, calling next');
      next();
    } catch (error) {
      console.log('AuthMiddleware: Error caught', error);
      // Check if it's a token verification error (expired/invalid)
      const isTokenError = error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError' || error.message?.includes('jwt');
      
      const exception = new HttpException(
        { message: 'Invalid token or session', tokenExpire: isTokenError },
        HttpStatus.UNAUTHORIZED,
      );
      
      throw exception;
    }
  }
}
