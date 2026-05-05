import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { TourAdminController } from './tour.admin.controller';
import { TourPublicController } from './tour.public.controller';
import { TourService } from './tour.service';
import { Tour, TourSchema } from './schema/tour.schema';
import { ProvincesModule } from 'src/provinces/provinces.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { FavoriteModule } from 'src/favorite/favorite.module';
import { ElasticsearchModule } from 'src/elasticsearch/elasticsearch.module';
import { EnvModule } from 'src/env/env.module';
import { TourSearchService } from './tour-search.service';
import { TourRepository } from './tour.repository';
import { TourIndexListener } from './tour-index.listener';
import { TOUR_INDEX_QUEUE } from './tour-index.constants';
import { TourIndexQueueService } from './tour-index.queue';
import { TourIndexProcessor } from './tour-index.processor';
import { tourEsCounterProviders } from './tour-es.metrics';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tour.name, schema: TourSchema }]),
    ProvincesModule,
    CloudinaryModule,
    FavoriteModule,
    EnvModule,
    ElasticsearchModule,
    BullModule.registerQueue({ name: TOUR_INDEX_QUEUE }),
  ],
  controllers: [TourPublicController, TourAdminController],
  providers: [
    ...tourEsCounterProviders,
    TourRepository,
    TourService,
    TourSearchService,
    TourIndexListener,
    TourIndexQueueService,
    TourIndexProcessor,
  ],
  exports: [TourService, TourSearchService],
})
export class TourModule {}
