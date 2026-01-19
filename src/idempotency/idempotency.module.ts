import { Module } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyController } from './idempotency.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Idempotency, IdempotencySchema } from './schema/idempotency.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Idempotency.name, schema: IdempotencySchema },
    ]),
  ],
  controllers: [IdempotencyController],
  providers: [IdempotencyService],
  exports: [IdempotencyService],
})
export class IdempotencyModule {}
