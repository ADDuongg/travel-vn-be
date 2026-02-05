import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TourService } from './tour.service';
import { CreateTourDto } from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { TourQueryDto } from './dto/tour-query.dto';

@Controller('api/v1/tours')
export class TourController {
  constructor(private readonly tourService: TourService) {}

  @Post()
  create(@Body() dto: CreateTourDto) {
    return this.tourService.create(dto);
  }

  @Get()
  findAll(@Query() query: TourQueryDto) {
    return this.tourService.findAll(query);
  }

  @Get('options')
  getOptions(@Query('destinationId') destinationId?: string) {
    return this.tourService.findAllActive(destinationId);
  }

  @Get('featured')
  getFeatured(@Query('limit') limit?: number) {
    return this.tourService.findFeatured(limit);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.tourService.findBySlug(slug);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.tourService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTourDto) {
    return this.tourService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.tourService.delete(id);
  }
}
