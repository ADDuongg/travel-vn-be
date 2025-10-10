import { Module } from '@nestjs/common';
import { TestApiController } from './test_api.controller';
import { TestApiService } from './test_api.service';

@Module({
  controllers: [TestApiController],
  providers: [TestApiService]
})
export class TestApiModule {}
