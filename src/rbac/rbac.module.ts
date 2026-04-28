import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UserModule } from 'src/user/user.module';
import { RolesModule } from 'src/roles/roles.module';

import { AdminGuard } from 'src/guards/admin.guard';
import { PermissionGuard } from 'src/guards/permission.guard';

import { RbacService } from './rbac.service';
import { RbacAdminController } from './rbac.admin.controller';
import { RbacPermission, RbacPermissionSchema } from './schemas/rbac-permission.schema';
import {
  RbacRolePermission,
  RbacRolePermissionSchema,
} from './schemas/rbac-role-permission.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RbacPermission.name, schema: RbacPermissionSchema },
      { name: RbacRolePermission.name, schema: RbacRolePermissionSchema },
    ]),
    UserModule,
    RolesModule,
  ],
  controllers: [RbacAdminController],
  providers: [RbacService, AdminGuard, PermissionGuard],
  /**
   * Re-export UserModule so AdminGuard (UserService) resolves in feature modules (e.g. MediaModule).
   */
  exports: [RbacService, AdminGuard, PermissionGuard, UserModule],
})
export class RbacModule {}
