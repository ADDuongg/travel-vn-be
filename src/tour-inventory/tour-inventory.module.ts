import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TourInventoryController } from './tour-inventory.controller';
import { TourInventoryService } from './tour-inventory.service';
import {
  TourInventory,
  TourInventorySchema,
} from './schema/tour-inventory.schema';
import { Tour, TourSchema } from 'src/tour/schema/tour.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TourInventory.name, schema: TourInventorySchema },
      { name: Tour.name, schema: TourSchema },
    ]),
  ],
  controllers: [TourInventoryController],
  providers: [TourInventoryService],
  exports: [TourInventoryService],
})
export class TourInventoryModule {}
