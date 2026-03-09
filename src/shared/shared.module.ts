import { Module } from '@nestjs/common';
import { EnvService } from 'src/env/env.service';

@Module({
  providers: [EnvService],
  exports: [EnvService],
})
export class SharedModule {}
