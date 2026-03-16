import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OtpService } from './otp.service';
import { OtpPurpose } from './otp.types';

class SendOtpDto {
  purpose: OtpPurpose;
  target: string;
  meta?: Record<string, unknown>;
}

class VerifyOtpDto {
  purpose: OtpPurpose;
  target: string;
  code: string;
}

@Controller('api/v1/otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Throttle({ auth: { ttl: 60_000, limit: 10 } })
  @Post('send')
  async send(@Body() dto: SendOtpDto) {
    await this.otpService.issue(dto.purpose, dto.target, {
      meta: dto.meta,
    });
    return { success: true };
  }

  @Throttle({ auth: { ttl: 60_000, limit: 20 } })
  @Post('verify')
  async verify(@Body() dto: VerifyOtpDto) {
    const record = await this.otpService.verifyAndConsume(
      dto.purpose,
      dto.target,
      dto.code,
    );

    return { success: true, purpose: record.purpose, target: record.target };
  }
}
