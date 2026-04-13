import { Test, TestingModule } from '@nestjs/testing';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';

describe('ReviewController', () => {
  let controller: ReviewController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewController],
      providers: [
        {
          provide: ReviewService,
          useValue: {
            findPublicReviews: jest.fn(),
            findMyReview: jest.fn(),
            adminFindAll: jest.fn(),
            upsertReview: jest.fn(),
            approveReview: jest.fn(),
            removeReview: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ReviewController>(ReviewController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
