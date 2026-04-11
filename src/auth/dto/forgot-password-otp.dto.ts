import { IsString, Length } from 'class-validator';

export class ForgotPasswordRequestDto {
  /**
   * Username, email hoặc số điện thoại để xác định tài khoản.
   */
  @IsString()
  identifier: string;
}

export class ForgotPasswordConfirmDto {
  /**
   * Token đặt lại mật khẩu đã được gửi qua email.
   */
  @IsString()
  token: string;

  /**
   * Mật khẩu mới.
   */
  @IsString()
  @Length(6, 128)
  newPassword: string;
}
