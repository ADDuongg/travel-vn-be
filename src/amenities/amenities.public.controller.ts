import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AmenitiesService } from './amenities.service';

@ApiTags('Public · Amenities')
@Controller('public/amenities')
export class AmenitiesPublicController {
  constructor(private readonly amenitiesService: AmenitiesService) {}

  @Get()
  findAll() {
    return this.amenitiesService.findAll();
  }
}
