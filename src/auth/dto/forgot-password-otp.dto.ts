import { IsString, Length, Matches } from 'class-validator';

export class ForgotPasswordRequestDto {
  @IsString()
  identifier: string;
}

export class ForgotPasswordConfirmDto {
  @IsString()
  identifier: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code: string;

  @IsString()
  @Length(6, 128)
  newPassword: string;
}
