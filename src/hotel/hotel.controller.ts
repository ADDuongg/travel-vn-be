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
  UseInterceptors,
} from '@nestjs/common';
import { HotelService } from './hotel.service';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { JwtOptionalAuthGuard } from 'src/guards/jwt-optional-auth.guard';
import { CrudAuditInterceptor } from 'src/audit-log/interceptors/crud-audit.interceptor';
import { AuditLog } from 'src/audit-log/decorators/audit-log.decorator';
import { AuditResourceType } from 'src/audit-log/enums/audit-log.enum';

@Controller('api/v1/hotels')
@UseInterceptors(CrudAuditInterceptor)
export class HotelController {
  constructor(private readonly hotelService: HotelService) {}

  @Post()
  @AuditLog(AuditResourceType.HOTEL)
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
  @AuditLog(AuditResourceType.HOTEL)
  update(@Param('id') id: string, @Body() dto: UpdateHotelDto) {
    return this.hotelService.update(id, dto);
  }
}
