import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiCode } from 'src/common/decorators/api-code.decorator';
import { RequirePermissions } from 'src/common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { PermissionGuard } from 'src/guards/permission.guard';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@ApiBearerAuth()
@ApiTags('Admin · Roles')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionGuard)
@Controller('admin/roles')
export class RolesAdminController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermissions('rbac.manage')
  @ApiCode('roles.admin.create')
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Get()
  @RequirePermissions('role.view')
  @ApiCode('roles.admin.list')
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @RequirePermissions('role.view')
  @ApiCode('roles.admin.get-one')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('rbac.manage')
  @ApiCode('roles.admin.update')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('rbac.manage')
  @ApiCode('roles.admin.remove')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
