import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { OtpPurpose } from '../otp.types';

export class SendOtpDto {
  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;

  @IsString()
  target!: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}
