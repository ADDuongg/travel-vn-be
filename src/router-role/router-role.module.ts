import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RouterRoleService } from './router-role.service';
import { RouterRoleController } from './router-role.controller';
import { RouterRole, RouterRoleSchema } from './schema/router-role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: RouterRole.name,
        schema: RouterRoleSchema,
      },
    ]),
  ],
  controllers: [RouterRoleController],
  providers: [RouterRoleService],
  exports: [RouterRoleService],
})
export class RouterRoleModule {}
