import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyController } from './idempotency.controller';
import { IdempotencyService } from './idempotency.service';

describe('IdempotencyController', () => {
  let controller: IdempotencyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdempotencyController],
      providers: [IdempotencyService],
    }).compile();

    controller = module.get<IdempotencyController>(IdempotencyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
