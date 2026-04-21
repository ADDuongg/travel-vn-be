import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ReviewService } from './review.service';
import { Review } from './schema/ewview.schema';
import { Room } from 'src/room/schema/room.schema';
import { Tour } from 'src/tour/schema/tour.schema';
import { TourGuide } from 'src/tour-guide/schema/tour-guide.schema';
import { Hotel } from 'src/hotel/schema/hotel.schema';

describe('ReviewService', () => {
  let service: ReviewService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: getModelToken(Review.name), useValue: {} },
        { provide: getModelToken(Room.name), useValue: {} },
        { provide: getModelToken(Tour.name), useValue: {} },
        { provide: getModelToken(TourGuide.name), useValue: {} },
        { provide: getModelToken(Hotel.name), useValue: {} },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
