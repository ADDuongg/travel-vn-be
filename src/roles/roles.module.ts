import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/schema/user.schema';
import {
  RbacRolePermission,
  RbacRolePermissionSchema,
} from 'src/rbac/schemas/rbac-role-permission.schema';

import { RolesService } from './roles.service';
import { RolesAdminController } from './roles.admin.controller';
import { Role, RoleSchema } from './schemas/role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: User.name, schema: UserSchema },
      {
        name: RbacRolePermission.name,
        schema: RbacRolePermissionSchema,
      },
    ]),
  ],
  controllers: [RolesAdminController],
  providers: [RolesService],
  exports: [RolesService, MongooseModule],
})
export class RolesModule {}
