import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProvincesService } from './provinces.service';
import { ProvinceQueryDto } from './dto/province-query.dto';

@ApiTags('Public · Provinces')
@Controller('public/provinces')
export class ProvincesPublicController {
  constructor(private readonly provincesService: ProvincesService) {}

  @Get()
  findAll(@Query() query: ProvinceQueryDto) {
    return this.provincesService.findAll(query);
  }

  @Get('popular')
  findPopular() {
    return this.provincesService.findPopular();
  }

  @Get('dropdown')
  findAllForDropdown() {
    return this.provincesService.findAllForDropdown();
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.provincesService.findBySlug(slug);
  }
}
