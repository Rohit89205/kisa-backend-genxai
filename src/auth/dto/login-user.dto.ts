import { IsEmail, IsNotEmpty, IsBoolean, IsOptional, IsNumber, IsString } from 'class-validator';

export class LoginUserDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;

  @IsBoolean()
  is_official: boolean;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lon?: number;
}
