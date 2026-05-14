import { IsString, Length, Matches } from 'class-validator';

export class ForgotPasswordRequestDto {
  /**
   * Username, email hoặc số điện thoại để xác định tài khoản.
   */
  @IsString()
  identifier: string;
}

export class ForgotPasswordConfirmDto {
  /**
   * Username, email hoặc số điện thoại (cùng giá trị đã dùng ở bước request).
   */
  @IsString()
  identifier: string;

  /**
   * Mã OTP 6 chữ số đã được gửi qua email.
   */
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code: string;

  /**
   * Mật khẩu mới.
   */
  @IsString()
  @Length(6, 128)
  newPassword: string;
}
