import { Controller, Get, Post, Body, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { UserService } from './user.service';
import { SignupUserDto } from './dto/signup-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { SendVerificationMailUserDto } from './dto/send_verification_mail-user.dto';

@Controller('auth')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('signup')
  signup(@Body() dto: SignupUserDto) {
    return this.userService.signup(dto);
  }

  @Post('login')
  login(@Body() dto: LoginUserDto) {
    return this.userService.login(dto);
  }

  @Post('refresh-token')
  refresh(@Body('refresh_token') token: string) {
    return this.userService.refreshToken(token);
  }

  @Post('send-verification-mail')
  sendVerificationMail(@Body() dto: SendVerificationMailUserDto) {
    return this.userService.sendVerificationMail(dto);
  }

  @Post('resend-verification-mail')
  resendVerificationMail(@Body() dto: SendVerificationMailUserDto) {
    return this.userService.resendVerificationMail(dto);
  }

  @Post('verify-otp')
  verifyOtp(@Body() body: { email: string; otp: string }) {
    return this.userService.verifyOtp(body.email, body.otp);
  }

  @Get('logout')
  logout(@Req() req: any) {
    console.log('Controller: Logout called');
    const userId = req.user.id;
    const accessToken = req.get('authorization')?.replace('Bearer ', '');
    console.log('Controller: userId', userId, 'accessToken', accessToken?.substring(0, 10));
    return this.userService.logout(userId, accessToken);
  }

  @Post('forgot-password')
  async sendResetPasswordMail(@Body('email') email: string, @Res() res: Response) {
    try {
      console.log('Controller: sendResetPasswordMail called');
      const result = await this.userService.sendResetPasswordMail(email);
      if (result.success) {
        res.status(result.statusCode || 200).json(result);
      } else {
        res.status(result.statusCode || 500).json(result);
      }
    } catch (error) {
      console.log('Controller: sendResetPasswordMail error', error);
    }
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPassword: string }, @Res() res: Response) {
    try {
      console.log('Controller: resetPassword called');
      const result = await this.userService.resetPassword(body.token, body.newPassword);
      if (result.success) {
        res.status(result.statusCode || 200).json(result);
      } else {
        res.status(result.statusCode || 500).json(result);
      }
    } catch (error) {
      console.log('Controller: resetPassword error', error);
    }
  }
}
