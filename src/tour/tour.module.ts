import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TourAdminController } from './tour.admin.controller';
import { TourPublicController } from './tour.public.controller';
import { TourService } from './tour.service';
import { Tour, TourSchema } from './schema/tour.schema';
import { ProvincesModule } from 'src/provinces/provinces.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { FavoriteModule } from 'src/favorite/favorite.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tour.name, schema: TourSchema }]),
    ProvincesModule,
    CloudinaryModule,
    FavoriteModule,
  ],
  controllers: [TourPublicController, TourAdminController],
  providers: [TourService],
  exports: [TourService],
})
export class TourModule {}
