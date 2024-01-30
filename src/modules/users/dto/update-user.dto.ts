import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(8)
  @IsOptional()
  newPassword: string;

  @IsOptional()
  @IsString()
  @IsEmail()
  newEmail: string;
}
