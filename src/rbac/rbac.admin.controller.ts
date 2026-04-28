import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiCode } from 'src/common/decorators/api-code.decorator';
import { RequirePermissions } from 'src/common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { PermissionGuard } from 'src/guards/permission.guard';

import { AuditLogService } from 'src/audit-log/audit-log.service';
import {
  AuditCategory,
  AuditResourceType,
  CrudAuditAction,
} from 'src/audit-log/enums/audit-log.enum';

import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';
import { RbacService } from './rbac.service';

type AdminReq = {
  user?: { userId?: string; username?: string };
};

@ApiBearerAuth()
@ApiTags('Admin · RBAC')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionGuard)
@Controller('admin/rbac')
export class RbacAdminController {
  constructor(
    private readonly rbacService: RbacService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get('permissions')
  @RequirePermissions('rbac.manage')
  @ApiCode('rbac.admin.list-permissions')
  listPermissions() {
    return this.rbacService.listPermissions();
  }

  @Get('roles/:roleId/permissions')
  @RequirePermissions('rbac.manage')
  @ApiCode('rbac.admin.get-role-permissions')
  getRolePermissions(@Param('roleId') roleId: string) {
    return this.rbacService.getPermissionKeysForRole(roleId);
  }

  @Put('roles/:roleId/permissions')
  @RequirePermissions('rbac.manage')
  @ApiCode('rbac.admin.set-role-permissions')
  async setRolePermissions(
    @Param('roleId') roleId: string,
    @Body() dto: SetRolePermissionsDto,
    @Req() req: AdminReq,
  ) {
    const result = await this.rbacService.setPermissionsForRole(
      roleId,
      dto.permissionKeys ?? [],
    );

    await this.auditLogService.log({
      category: AuditCategory.CRUD,
      action: CrudAuditAction.RESOURCE_UPDATED,
      resourceType: AuditResourceType.ROLE,
      resourceId: result.roleId,
      userId: req.user?.userId,
      username: req.user?.username,
      description: `RBAC permissions replaced for role ${result.roleCode}`,
      oldValue: { permissionKeys: result.previousKeys },
      newValue: { permissionKeys: result.newKeys },
    });

    return result;
  }
}
