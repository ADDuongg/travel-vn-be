import { Module } from '@nestjs/common';
import { OtpController } from './otp.controller';
import { OtpRepository } from './otp.repository';
import { OtpService } from './otp.service';
import { RedisModule } from '../redis/redis.module';
import { EnvModule } from 'src/env/env.module';

@Module({
  imports: [RedisModule, EnvModule],
  controllers: [OtpController],
  providers: [OtpRepository, OtpService],
  exports: [OtpService],
})
export class OtpModule {}
