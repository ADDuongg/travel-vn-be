import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TourGuide, TourGuideSchema } from './schema/tour-guide.schema';
import { TourGuideController } from './tour-guide.controller';
import { TourGuideService } from './tour-guide.service';
import { UserModule } from 'src/user/user.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { ReviewModule } from 'src/review/review.module';
import { FavoriteModule } from 'src/favorite/favorite.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TourGuide.name, schema: TourGuideSchema },
    ]),
    UserModule,
    CloudinaryModule,
    ReviewModule,
    FavoriteModule,
  ],
  controllers: [TourGuideController],
  providers: [TourGuideService],
  exports: [TourGuideService],
})
export class TourGuideModule {}
