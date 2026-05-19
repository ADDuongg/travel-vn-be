import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiCode } from 'src/common/decorators/api-code.decorator';
import { RequirePermissions } from 'src/common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { PermissionGuard } from 'src/guards/permission.guard';
import { ProvincesService } from './provinces.service';
import { UpdateProvinceDto } from './dto/update-province.dto';

@ApiBearerAuth()
@ApiTags('Admin · Provinces')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionGuard)
@Controller('admin/provinces')
export class ProvincesAdminController {
  constructor(private readonly provincesService: ProvincesService) {}

  @Patch(':id')
  @RequirePermissions('province.update')
  @ApiCode('province.admin.update')
  update(@Param('id') id: string, @Body() dto: UpdateProvinceDto) {
    return this.provincesService.update(id, dto);
  }

  @Patch(':id/toggle-popular')
  @RequirePermissions('province.update')
  @ApiCode('province.admin.toggle-popular')
  togglePopular(@Param('id') id: string) {
    return this.provincesService.togglePopular(id);
  }

  @Patch(':id/restore')
  @RequirePermissions('province.update')
  @ApiCode('province.admin.restore')
  restore(@Param('id') id: string) {
    return this.provincesService.restore(id);
  }

  @Delete(':id')
  @RequirePermissions('province.update')
  @ApiCode('province.admin.delete')
  softDelete(@Param('id') id: string) {
    return this.provincesService.softDelete(id);
  }
}
