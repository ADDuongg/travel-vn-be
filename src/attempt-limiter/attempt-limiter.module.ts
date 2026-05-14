import { Global, Module } from '@nestjs/common';
import { AttemptLimiterService } from './attempt-limiter.service';

@Global()
@Module({
  providers: [AttemptLimiterService],
  exports: [AttemptLimiterService],
})
export class AttemptLimiterModule {}
