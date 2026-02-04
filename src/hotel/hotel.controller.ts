import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { HotelService } from './hotel.service';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';

@Controller('api/v1/hotels')
export class HotelController {
  constructor(private readonly hotelService: HotelService) {}

  @Post()
  create(@Body() dto: CreateHotelDto) {
    return this.hotelService.create(dto);
  }

  @Get('options')
  getOptions(@Query('provinceId') provinceId?: string) {
    return this.hotelService.findAllActive(provinceId);
  }

  @Get()
  findAll(@Query('provinceId') provinceId?: string) {
    return this.hotelService.findAllActive(provinceId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.hotelService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateHotelDto) {
    return this.hotelService.update(id, dto);
  }
}
