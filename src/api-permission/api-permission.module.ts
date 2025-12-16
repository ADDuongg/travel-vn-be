import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ApiPermissionService } from './api-permission.service';
import { ApiPermissionController } from './api-permission.controller';
import {
  ApiPermission,
  ApiPermissionSchema,
} from './schema/api-permission.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ApiPermission.name,
        schema: ApiPermissionSchema,
      },
    ]),
  ],
  controllers: [ApiPermissionController],
  providers: [ApiPermissionService],
  exports: [ApiPermissionService],
})
export class ApiPermissionModule {}
