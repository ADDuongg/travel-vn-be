import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { DomainException, NotFoundDomainException, ForbiddenDomainException } from 'src/common/exceptions';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiCode } from 'src/common/decorators/api-code.decorator';
import { RequirePermissions } from 'src/common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { PermissionGuard } from 'src/guards/permission.guard';
import { AuditLog } from 'src/audit-log/decorators/audit-log.decorator';
import { AuditResourceType } from 'src/audit-log/enums/audit-log.enum';
import { CrudAuditInterceptor } from 'src/audit-log/interceptors/crud-audit.interceptor';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@ApiBearerAuth()
@ApiTags('Admin · Users')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionGuard)
@UseInterceptors(CrudAuditInterceptor)
@Controller('admin/users')
export class UserAdminController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @RequirePermissions('user.create')
  @AuditLog(AuditResourceType.USER)
  @ApiCode('user.admin.create')
  create(@Body() createUserDto: CreateUserDto) {
    try {
      return this.userService.create(createUserDto);
    } catch {
      throw new ForbiddenDomainException('Forbidden', 'FORBIDDEN', 'user.forbidden');
    }
  }

  @Get()
  @RequirePermissions('user.view')
  @ApiCode('user.admin.list')
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @RequirePermissions('user.view')
  @ApiCode('user.admin.get')
  findOneById(@Param('id') id: string) {
    return this.userService.findOneById(id);
  }

  @Patch(':id')
  @RequirePermissions('user.update')
  @AuditLog(AuditResourceType.USER)
  @ApiCode('user.admin.update')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Patch(':id/reset-password')
  @RequirePermissions('user.update')
  @AuditLog(AuditResourceType.USER)
  @ApiCode('user.admin.reset-password')
  resetPassword(@Param('id') id: string) {
    return this.userService.resetPasswordToDefault(id);
  }

  @Delete(':id')
  @RequirePermissions('user.delete')
  @AuditLog(AuditResourceType.USER)
  @ApiCode('user.admin.delete')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
