import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Hotel, HotelSchema } from 'src/hotel/schema/hotel.schema';
import { TourGuide, TourGuideSchema } from 'src/tour-guide/schema/tour-guide.schema';
import { Tour, TourSchema } from 'src/tour/schema/tour.schema';
import { Province, ProvinceSchema } from './schema/province.schema';
import { ProvincesController } from './provinces.controller';
import { ProvincesService } from './provinces.service';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Province.name, schema: ProvinceSchema },
      { name: Hotel.name, schema: HotelSchema },
      { name: Tour.name, schema: TourSchema },
      { name: TourGuide.name, schema: TourGuideSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [ProvincesController],
  providers: [ProvincesService],
  exports: [ProvincesService],
})
export class ProvincesModule {}
