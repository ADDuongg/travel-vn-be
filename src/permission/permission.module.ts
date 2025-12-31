// auth.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiRole, ApiRoleSchema } from 'src/api-role/schema/api-role.schema';
import {
  RouterRole,
  RouterRoleSchema,
} from 'src/router-role/schema/router-role.schema';
import { PermissionService } from '../permission/permission.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RouterRole.name, schema: RouterRoleSchema },
      { name: ApiRole.name, schema: ApiRoleSchema },
    ]),
  ],
  providers: [PermissionService],
  exports: [PermissionService],
})
export class PermissionModule {}
