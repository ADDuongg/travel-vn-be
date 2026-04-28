import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CrudAuditInterceptor } from 'src/audit-log/interceptors/crud-audit.interceptor';
import { JwtOptionalAuthGuard } from 'src/guards/jwt-optional-auth.guard';
import { TourGuideQueryDto } from './dto/tour-guide-query.dto';
import { TourGuideService } from './tour-guide.service';

@ApiTags('Public · Tour guides')
@UseInterceptors(CrudAuditInterceptor)
@Controller('public/tour-guides')
export class TourGuidePublicController {
  constructor(private readonly tourGuideService: TourGuideService) {}

  @Get()
  @UseGuards(JwtOptionalAuthGuard)
  findAll(
    @Query() query: TourGuideQueryDto,
    @Req() req: { user?: { userId: string } },
  ) {
    return this.tourGuideService.findAll(query, req.user?.userId);
  }

  @Get(':id/reviews')
  getReviews(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tourGuideService.getReviews(
      id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get(':id')
  @UseGuards(JwtOptionalAuthGuard)
  findOne(@Param('id') id: string, @Req() req: { user?: { userId: string } }) {
    return this.tourGuideService.findOne(id, req.user?.userId);
  }
}
