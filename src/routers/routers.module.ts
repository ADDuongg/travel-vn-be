import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RouterService } from './routers.service';
import { RouterController } from './routers.controller';
import { Router, RouterSchema } from './schemas/router.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Router.name, schema: RouterSchema }]),
  ],
  controllers: [RouterController],
  providers: [RouterService],
  exports: [RouterService],
})
export class RoutersModule {}
