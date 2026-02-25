// src/auth/dto/register.dto.ts
import { OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { IsOptional, IsString, Length } from 'class-validator';

export class RegisterDto extends OmitType(CreateUserDto, ['roles', 'permissions'] as const) {
  @IsString()
  @Length(8, 128)
  confirmPassword!: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
