import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from './models/user.model';
import { UserSession } from './models/user_session.model';
import * as bcrypt from 'bcrypt';
import { validate } from 'class-validator';
import { SignupUserDto } from './dto/signup-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { SendVerificationMailUserDto } from './dto/send_verification_mail-user.dto';
import { ResponseHelper } from '../common/helper/response.helper';
import { TokenService } from '../common/service/jwt.service';
import { MailService } from '../common/service/mail.service';
import {
  email_verification,
  reset_password,
} from '../common/helper/mail_template';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,
    @InjectModel(UserSession)
    private readonly userSessionModel: typeof UserSession,
    private readonly tokenService: TokenService,
    private readonly mailService: MailService,
  ) {}

  // Signup
  async signup(dto: SignupUserDto) {
    try {
      // Validation using class-validator
      const dtoInstance = Object.assign(new SignupUserDto(), dto);
      const errors = await validate(dtoInstance);
      if (errors.length > 0) {
        const messages = errors
          .map((err) => {
            const constraints = err.constraints
              ? Object.values(err.constraints).join(', ')
              : 'is invalid';
            return `${constraints}`;
          })
          .join(', ');
        return ResponseHelper.error({
          message: messages,
          statusCode: 400,
        });
      }

      // Password confirmation check
      if (dto.confirm_password !== dto.password) {
        return ResponseHelper.error({
          message: 'Password and Confirm Password do not match',
          statusCode: 400,
        });
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      // Update the unverified user
      await this.userModel.update(
        {
          name: dto.name,
          phone_no: dto.phone_no,
          password: hashedPassword,
          is_verified: true,
          is_active: true,
        },
        {
          where: { email: dto.email },
        },
      );
      return ResponseHelper.success({
        message: 'You have registered successfully',
      });
    } catch (error) {
      console.error('Signup error:', error);
      return ResponseHelper.error({
        message: 'Internal server error',
        statusCode: 500,
      });
    }
  }

  // Login
  async login(dto: LoginUserDto) {
    const user = await this.userModel.findOne({
      where: { email: dto.email, is_verified: true, is_active: true },
      raw: true,
    });

    if (!user) {
      return ResponseHelper.error({
        message: 'Invalid email or password',
        statusCode: 401,
      });
    }

    if (user.is_official !== dto.is_official) {
      return ResponseHelper.error({
        message: 'You are not registered as the selected user type',
        statusCode: 401,
      });
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);

    if (!isMatch) {
      return ResponseHelper.error({
        message: 'Invalid email or password',
        statusCode: 401,
      });
    }

    const payload = {
      id: user.id,
    };

    const accessToken = this.tokenService.generateAccessToken(payload);
    const refreshToken = this.tokenService.generateRefreshToken(payload);

    await this.userSessionModel.create({
      refresh_token: refreshToken,
      access_token: accessToken,
      user_id: user.id,
      state: dto.state,
      district: dto.district,
      lat: dto.lat,
      lon: dto.lon,
    } as any);

    return ResponseHelper.success({
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        userName: user.name,
        is_official: user.is_official,
      },
    });
  }

  // Refresh Token
  async refreshToken(oldToken: string) {
    try {
      const payload = this.tokenService.verifyToken(oldToken);

      const userSession = await this.userSessionModel.findOne({
        where: { user_id: payload.id, refresh_token: oldToken },
        raw: true,
      });

      if (!userSession) {
        return ResponseHelper.error({
          message: 'Invalid refresh token',
          statusCode: 401,
        });
      }

      const newAccessToken = this.tokenService.generateAccessToken({
        id: payload.id,
      });

      const newRefreshToken = this.tokenService.generateRefreshToken({
        id: payload.id,
      });

      // update new refresh token
      await this.userSessionModel.update(
        { refresh_token: newRefreshToken, access_token: newAccessToken },
        { where: { id: userSession.id, refresh_token: oldToken } },
      );

      return ResponseHelper.success({
        message: 'Token refreshed',
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (e) {
      console.error('Token refresh error:', e);
      return ResponseHelper.error({
        message: 'Invalid or expired refresh token',
        statusCode: 401,
      });
    }
  }

  // Send OTP for mail verification (optional)
  async sendVerificationMail(dto: SendVerificationMailUserDto) {
    try {
      const user = await this.userModel.findOne({
        where: {
          email: dto.email,
        },
        raw: true,
      });
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 60 * 1000); // 1 minute from now

      if (user?.is_verified && user?.is_active) {
        return ResponseHelper.error({
          message: 'This user is already registered and verified',
          statusCode: 409,
        });
      }
      if (user && (!user.is_verified || !user.is_active)) {
        // Update existing user's OTP
        await this.userModel.update(
          { otp, otp_expires_at: otpExpiresAt },
          { where: { email: dto.email } },
        );
      } else {
        await this.userModel.create({
          email: dto.email,
          name: dto.name,
          otp,
          otp_expires_at: otpExpiresAt,
        } as any);
      }
      const html = email_verification({ name: dto.name, otp });
      await this.mailService.sendMail({
        to: dto.email,
        subject: 'Email Verification',
        html,
      });
      return ResponseHelper.success({
        message: 'Please check your email for the verification OTP',
      });
    } catch (error) {
      console.error('Send verification mail error:', error);
      return ResponseHelper.error({
        message: 'Internal server error',
        statusCode: 500,
      });
    }
  }

  // Resend OTP for mail verification
  async resendVerificationMail(dto: SendVerificationMailUserDto) {
    return this.sendVerificationMail(dto);
  }

  // Verify OTP
  async verifyOtp(email: string, otp: string) {
    const user = await this.userModel.findOne({ where: { email }, raw: true });
    if (!user) {
      return ResponseHelper.error({
        message: 'User not found',
        statusCode: 404,
      });
    }
    if (user.otp != otp) {
      return ResponseHelper.error({
        message: 'Invalid OTP',
        statusCode: 400,
      });
    }

    if (!user.otp_expires_at || new Date() > user.otp_expires_at) {
      return ResponseHelper.error({
        message: 'OTP has expired',
        statusCode: 400,
      });
    }

    // Mark as verified and clear OTP
    await this.userModel.update(
      { is_verified: true, otp: null, otp_expires_at: null },
      { where: { email } },
    );

    return ResponseHelper.success({
      message: 'Email verified successfully',
      is_verified: true,
    });
  }

  async logout(userId: string, accessToken: string) {
    console.log(
      'Service: Logout called',
      userId,
      accessToken?.substring(0, 10),
    );
    await this.userSessionModel.destroy({
      where: { user_id: userId, access_token: accessToken },
    });
    console.log('Service: Session destroyed');
    return ResponseHelper.success({
      message: 'Logged out successfully',
    });
  }

  async sendResetPasswordMail(email: string) {
    try {
      const user = await this.userModel.findOne({
        where: { email, is_active: true },
        raw: true,
      });
      if (!user) {
        return ResponseHelper.error({
          message: 'User not found',
          statusCode: 404,
        });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 60 * 5000); // 1 minute from now

      await this.userModel.update(
        { otp, otp_expires_at: otpExpiresAt },
        { where: { email } },
      );
      // Create token with email and otp
      const resetData = { email, otp };
      const resetToken = Buffer.from(JSON.stringify(resetData)).toString(
        'base64',
      );
      const html = reset_password({
        name: user.name,
        link: `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`,
      });
      await this.mailService.sendMail({
        to: email,
        subject: 'Reset Password',
        html,
      });

      return ResponseHelper.success({
        message: 'Reset password mail is sent successfully',
      });
    } catch (error) {
      console.error('Reset password error:', error);
      return ResponseHelper.error({
        message: 'Internal server error',
        statusCode: 500,
      });
    }
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      // Decrypt token to get email and otp
      const resetData = JSON.parse(Buffer.from(token, 'base64').toString());
      const { email, otp } = resetData;

      const user = await this.userModel.findOne({
        where: { email, is_active: true },
        raw: true,
      });
      if (!user) {
        return ResponseHelper.error({
          message: 'Invalid reset token',
          statusCode: 400,
        });
      }

      if (user.otp !== otp) {
        return ResponseHelper.error({
          message: 'Invalid reset token',
          statusCode: 400,
        });
      }

      if (!user.otp_expires_at || new Date() > user.otp_expires_at) {
        return ResponseHelper.error({
          message: 'Reset token has expired',
          statusCode: 400,
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.userModel.update(
        { password: hashedPassword, otp: null, otp_expires_at: null },
        { where: { email } },
      );

      return ResponseHelper.success({
        message: 'Password reset successfully',
      });
    } catch (error) {
      console.error('Reset password error:', error);
      return ResponseHelper.error({
        message: 'Invalid reset token',
        statusCode: 500,
      });
    }
  }
}
