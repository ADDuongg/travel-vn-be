import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TourController } from './tour.controller';
import { TourService } from './tour.service';
import { Tour, TourSchema } from './schema/tour.schema';
import { ProvincesModule } from 'src/provinces/provinces.module';
import { TourInventoryModule } from 'src/tour-inventory/tour-inventory.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tour.name, schema: TourSchema }]),
    ProvincesModule,
    TourInventoryModule,
    CloudinaryModule,
  ],
  controllers: [TourController],
  providers: [TourService],
  exports: [TourService],
})
export class TourModule {}
