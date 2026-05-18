import { IsEnum, IsString, Length, Matches } from 'class-validator';
import { OtpPurpose } from '../otp.types';

export class VerifyOtpDto {
  @IsEnum(OtpPurpose)
  purpose!: OtpPurpose;

  @IsString()
  target!: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code!: string;
}
