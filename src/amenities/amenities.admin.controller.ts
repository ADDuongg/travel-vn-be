import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiCode } from 'src/common/decorators/api-code.decorator';
import { RequirePermissions } from 'src/common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { PermissionGuard } from 'src/guards/permission.guard';
import { AmenitiesService } from './amenities.service';
import { CreateAmenityDto } from './dto/create-amenity.dto';
import { UpdateAmenityDto } from './dto/update-amenity.dto';

@ApiBearerAuth()
@ApiTags('Admin · Amenities')
@UseGuards(JwtAuthGuard, AdminGuard, PermissionGuard)
@Controller('admin/amenities')
export class AmenitiesAdminController {
  constructor(private readonly amenitiesService: AmenitiesService) {}

  @ApiCode('amenities.admin.create')
  @RequirePermissions('amenity.create')
  @UseInterceptors(FileInterceptor('icon'))
  @Post()
  create(
    @Body() dto: CreateAmenityDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.amenitiesService.create(dto, file);
  }

  @ApiCode('amenities.admin.update')
  @RequirePermissions('amenity.update')
  @UseInterceptors(FileInterceptor('icon'))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAmenityDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.amenitiesService.update(id, dto, file);
  }

  @ApiCode('amenities.admin.delete')
  @RequirePermissions('amenity.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.amenitiesService.remove(id);
  }
}
