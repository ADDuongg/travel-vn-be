import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { HotelService } from './hotel.service';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { JwtOptionalAuthGuard } from 'src/guards/jwt-optional-auth.guard';

@Controller('api/v1/hotels')
export class HotelController {
  constructor(private readonly hotelService: HotelService) {}

  @Post()
  create(@Body() dto: CreateHotelDto) {
    return this.hotelService.create(dto);
  }

  @Get('options')
  @UseGuards(JwtOptionalAuthGuard)
  getOptions(
    @Query('provinceId') provinceId?: string,
    @Req() req?: { user?: { userId: string } },
  ) {
    return this.hotelService.findAllActive(provinceId, req?.user?.userId);
  }

  @Get()
  @UseGuards(JwtOptionalAuthGuard)
  findAll(
    @Query('provinceId') provinceId?: string,
    @Req() req?: { user?: { userId: string } },
  ) {
    return this.hotelService.findAllActive(provinceId, req?.user?.userId);
  }

  @Get(':id')
  @UseGuards(JwtOptionalAuthGuard)
  findOne(@Param('id') id: string, @Req() req: { user?: { userId: string } }) {
    return this.hotelService.findById(id, req.user?.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateHotelDto) {
    return this.hotelService.update(id, dto);
  }
}
