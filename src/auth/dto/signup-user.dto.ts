import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class SignupUserDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  phone_no: string;

  @MinLength(6)
  password: string;

  @MinLength(6)
  confirm_password: string;
}
