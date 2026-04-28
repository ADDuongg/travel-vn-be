import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiCode } from 'src/common/decorators/api-code.decorator';
import { RequirePermissions } from 'src/common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { PermissionGuard } from 'src/guards/permission.guard';
import { AuditLog } from 'src/audit-log/decorators/audit-log.decorator';
import { AuditResourceType } from 'src/audit-log/enums/audit-log.enum';
import { CrudAuditInterceptor } from 'src/audit-log/interceptors/crud-audit.interceptor';

import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomService } from './room.service';

@ApiBearerAuth()
@ApiTags('Admin · Rooms')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionGuard)
@UseInterceptors(CrudAuditInterceptor)
@Controller('admin/rooms')
export class RoomAdminController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  @RequirePermissions('room.create')
  @AuditLog(AuditResourceType.ROOM)
  @ApiCode('room.admin.create')
  @UseInterceptors(FilesInterceptor('gallery', 10))
  create(
    @Body() createRoomDto: CreateRoomDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.roomService.create(createRoomDto, files);
  }

  @Patch(':id')
  @RequirePermissions('room.update')
  @AuditLog(AuditResourceType.ROOM)
  @ApiCode('room.admin.update')
  @UseInterceptors(FilesInterceptor('gallery', 10))
  update(
    @Param('id') id: string,
    @Body() updateRoomDto: UpdateRoomDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.roomService.update(id, updateRoomDto, files);
  }

  @Delete(':id')
  @RequirePermissions('room.delete')
  @AuditLog(AuditResourceType.ROOM)
  @ApiCode('room.admin.delete')
  remove(@Param('id') id: string) {
    return this.roomService.remove(id);
  }
}
