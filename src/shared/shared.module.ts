import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EnvService } from 'src/env/env.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [EnvService],
  exports: [EnvService],
})
export class SharedModule {}
