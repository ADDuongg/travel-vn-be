import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewService } from './review.service';
import { ReviewPublicController } from './review.public.controller';
import { ReviewClientController } from './review.client.controller';
import { ReviewAdminController } from './review.admin.controller';
import { Review, ReviewSchema } from './schema/ewview.schema';
import { Room, RoomSchema } from 'src/room/schema/room.schema';
import { Tour, TourSchema } from 'src/tour/schema/tour.schema';
import {
  TourGuide,
  TourGuideSchema,
} from 'src/tour-guide/schema/tour-guide.schema';
import { Hotel, HotelSchema } from 'src/hotel/schema/hotel.schema';
import { ReviewSoftDeleteCleanupService } from './review-soft-delete-cleanup.service';
import { ReviewRepository } from './review.repository';
import { ReviewTargetRepository } from './review-target.repository';

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
  controllers: [
    ReviewPublicController,
    ReviewClientController,
    ReviewAdminController,
  ],
  providers: [
    ReviewRepository,
    ReviewTargetRepository,
    ReviewService,
    ReviewSoftDeleteCleanupService,
  ],
  exports: [ReviewService],
})
export class ReviewModule {}
