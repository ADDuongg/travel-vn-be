// src/auth/dto/register.dto.ts
import { OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { IsString, Length } from 'class-validator';

export class RegisterDto extends OmitType(CreateUserDto, ['role'] as const) {
  @IsString()
  @Length(8, 128)
  confirmPassword!: string;
}
