import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReviewService } from './review.service';
import { ReviewRepository } from './review.repository';
import { ReviewTargetRepository } from './review-target.repository';
import { CorrelationContextService } from 'src/common/correlation/correlation-context.service';

describe('ReviewService', () => {
  let service: ReviewService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: ReviewRepository, useValue: {} },
        { provide: ReviewTargetRepository, useValue: {} },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        {
          provide: CorrelationContextService,
          useValue: {
            getRequestId: jest.fn(),
            getStore: jest.fn(),
            setSafeUserContext: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
