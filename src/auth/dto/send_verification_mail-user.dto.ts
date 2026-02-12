import { IsEmail, IsNotEmpty } from 'class-validator';

export class SendVerificationMailUserDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  name: string;
}
