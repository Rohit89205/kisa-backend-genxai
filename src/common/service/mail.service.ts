import nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST'),
      port: Number(this.configService.get<string>('EMAIL_PORT')),
      secure: true,
      auth: {
        user: this.configService.get<string>('EMAIL_USERNAME'),
        pass: this.configService.get<string>('EMAIL_PASSWORD'),
      },
      tls: {
        rejectUnauthorized: true,
      },
    });
  }

  async sendMail(options: { to: string; subject: string; html: any }) {
    return await this.transporter.sendMail({
      from: this.configService.get<string>('EMAIL_USERNAME'),
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  }
}
