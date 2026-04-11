// amenities/amenities.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AmenitiesService } from './amenities.service';
import { CreateAmenityDto } from './dto/create-amenity.dto';
import { UpdateAmenityDto } from './dto/update-amenity.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('/api/v1/amenities')
export class AmenitiesController {
  constructor(private readonly amenitiesService: AmenitiesService) {}

  @UseInterceptors(FileInterceptor('icon'))
  @Post()
  create(
    @Body() dto: CreateAmenityDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    console.log('dto controller', dto);

    return this.amenitiesService.create(dto, file);
  }

  @UseInterceptors(FileInterceptor('icon'))
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAmenityDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.amenitiesService.update(id, dto, file);
  }

  @Get()
  findAll() {
    return this.amenitiesService.findAll();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.amenitiesService.remove(id);
  }
}
