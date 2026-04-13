import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { IdempotencyController } from './idempotency.controller';
import { IdempotencyService } from './idempotency.service';
import { Idempotency } from './schema/idempotency.schema';

describe('IdempotencyController', () => {
  let controller: IdempotencyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdempotencyController],
      providers: [
        IdempotencyService,
        { provide: getModelToken(Idempotency.name), useValue: {} },
      ],
    }).compile();

    controller = module.get<IdempotencyController>(IdempotencyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
