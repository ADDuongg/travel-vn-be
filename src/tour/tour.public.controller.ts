import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TourService } from './tour.service';
import { TourQueryDto } from './dto/tour-query.dto';
import { JwtOptionalAuthGuard } from 'src/guards/jwt-optional-auth.guard';

@ApiTags('Public · Tours')
@Controller('public/tours')
export class TourPublicController {
  constructor(private readonly tourService: TourService) {}

  @Get()
  @UseGuards(JwtOptionalAuthGuard)
  findAll(
    @Query() query: TourQueryDto,
    @Req() req: { user?: { userId: string } },
  ) {
    return this.tourService.findAll(query, req.user?.userId);
  }

  @Get('options')
  getOptions(@Query('destinationId') destinationId?: string) {
    return this.tourService.findAllActive(destinationId);
  }

  @Get('featured')
  @UseGuards(JwtOptionalAuthGuard)
  getFeatured(
    @Query('limit') limit?: number,
    @Req() req?: { user?: { userId: string } },
  ) {
    return this.tourService.findFeatured(limit, req?.user?.userId);
  }

  @Get('slug/:slug')
  @UseGuards(JwtOptionalAuthGuard)
  findBySlug(
    @Param('slug') slug: string,
    @Req() req: { user?: { userId: string } },
  ) {
    return this.tourService.findBySlug(slug, req.user?.userId);
  }

  @Get(':id')
  @UseGuards(JwtOptionalAuthGuard)
  findById(@Param('id') id: string, @Req() req: { user?: { userId: string } }) {
    return this.tourService.findById(id, req.user?.userId);
  }
}
