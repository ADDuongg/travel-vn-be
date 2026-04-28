import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HotelService } from './hotel.service';
import { HotelQueryDto } from './dto/hotel-query.dto';
import { JwtOptionalAuthGuard } from 'src/guards/jwt-optional-auth.guard';

@ApiTags('Public · Hotels')
@Controller('public/hotels')
export class HotelPublicController {
  constructor(private readonly hotelService: HotelService) {}

  @Get('options')
  @UseGuards(JwtOptionalAuthGuard)
  getOptions(
    @Query('provinceId') provinceId?: string,
    @Req() req?: { user?: { userId: string } },
  ) {
    return this.hotelService.findAllActiveOptions(
      provinceId,
      req?.user?.userId,
    );
  }

  @Get()
  @UseGuards(JwtOptionalAuthGuard)
  findAll(
    @Query() query?: HotelQueryDto,
    @Req() req?: { user?: { userId: string } },
  ) {
    return this.hotelService.findAllActive(query ?? {}, req?.user?.userId);
  }

  @Get(':id')
  @UseGuards(JwtOptionalAuthGuard)
  findOne(@Param('id') id: string, @Req() req: { user?: { userId: string } }) {
    return this.hotelService.findById(id, req.user?.userId);
  }
}
