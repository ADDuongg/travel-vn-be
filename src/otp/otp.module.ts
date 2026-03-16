import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OtpController } from './otp.controller';
import { OtpRepository } from './otp.repository';
import { OtpService } from './otp.service';

@Module({
  imports: [ConfigModule],
  controllers: [OtpController],
  providers: [OtpRepository, OtpService],
  exports: [OtpService],
})
export class OtpModule {}

