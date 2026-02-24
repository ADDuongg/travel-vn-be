import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { Review, ReviewSchema } from './schema/ewview.schema';
import { Room, RoomSchema } from 'src/room/schema/room.schema';
import { Tour, TourSchema } from 'src/tour/schema/tour.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: Room.name, schema: RoomSchema },
      { name: Tour.name, schema: TourSchema },
    ]),
  ],
  controllers: [ReviewController],
  providers: [ReviewService],
})
export class ReviewModule {}
