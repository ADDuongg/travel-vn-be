import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { Review, ReviewSchema } from './schema/ewview.schema';
import { Room, RoomSchema } from 'src/room/schema/room.schema';
import { Tour, TourSchema } from 'src/tour/schema/tour.schema';
import {
  TourGuide,
  TourGuideSchema,
} from 'src/tour-guide/schema/tour-guide.schema';
import { Hotel, HotelSchema } from 'src/hotel/schema/hotel.schema';
import { ReviewSoftDeleteCleanupService } from './review-soft-delete-cleanup.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: Room.name, schema: RoomSchema },
      { name: Tour.name, schema: TourSchema },
      { name: TourGuide.name, schema: TourGuideSchema },
      { name: Hotel.name, schema: HotelSchema },
    ]),
  ],
  controllers: [ReviewController],
  providers: [ReviewService, ReviewSoftDeleteCleanupService],
  exports: [ReviewService],
})
export class ReviewModule {}
