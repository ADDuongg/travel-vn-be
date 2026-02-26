import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { HttpExceptionFilter } from 'src/interceptor/http-fail.interceptor.filter';
import { TourGuideService } from './tour-guide.service';
import { CreateTourGuideDto } from './dto/create-tour-guide.dto';
import { UpdateTourGuideDto } from './dto/update-tour-guide.dto';
import { TourGuideQueryDto } from './dto/tour-guide-query.dto';
import { VerifyTourGuideDto } from './dto/verify-tour-guide.dto';

@Controller('api/v1/tour-guides')
@UseFilters(new HttpExceptionFilter())
export class TourGuideController {
  constructor(private readonly tourGuideService: TourGuideService) {}

  @Get()
  findAll(@Query() query: TourGuideQueryDto) {
    return this.tourGuideService.findAll(query);
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
  findOne(@Param('id') id: string) {
    return this.tourGuideService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'cv', maxCount: 1 },
      { name: 'gallery', maxCount: 10 },
    ]),
  )
  create(
    @Body() dto: CreateTourGuideDto,
    @Req() req: { files?: Record<string, Express.Multer.File[]> },
  ) {
    const cv = req.files?.cv?.[0];
    const gallery = req.files?.gallery ?? [];
    return this.tourGuideService.create(dto, cv, gallery);
  }

  @Post('register')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'cv', maxCount: 1 },
      { name: 'gallery', maxCount: 10 },
    ]),
  )
  register(
    @Req()
    req: {
      user: { userId: string };
      files?: Record<string, Express.Multer.File[]>;
    },
    @Body() dto: CreateTourGuideDto,
  ) {
    const cv = req.files?.cv?.[0];
    const gallery = req.files?.gallery ?? [];
    return this.tourGuideService.register(req.user.userId, dto, cv, gallery);
  }

  @Patch('my-profile')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'cv', maxCount: 1 },
      { name: 'gallery', maxCount: 10 },
    ]),
  )
  updateMyProfile(
    @Req()
    req: {
      user: { userId: string };
      files?: Record<string, Express.Multer.File[]>;
    },
    @Body() dto: UpdateTourGuideDto,
  ) {
    const cv = req.files?.cv?.[0];
    const gallery = req.files?.gallery ?? [];
    return this.tourGuideService.updateMyProfile(
      req.user.userId,
      dto,
      cv,
      gallery,
    );
  }

  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, AdminGuard)
  verify(@Param('id') id: string, @Body() dto: VerifyTourGuideDto) {
    return this.tourGuideService.verify(id, dto.isVerified);
  }

  @Patch(':id/availability')
  @UseGuards(JwtAuthGuard, AdminGuard)
  toggleAvailability(@Param('id') id: string) {
    return this.tourGuideService.toggleAvailability(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'cv', maxCount: 1 },
      { name: 'gallery', maxCount: 10 },
    ]),
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTourGuideDto,
    @Req() req: { files?: Record<string, Express.Multer.File[]> },
  ) {
    const cv = req.files?.cv?.[0];
    const gallery = req.files?.gallery ?? [];
    return this.tourGuideService.update(id, dto, cv, gallery);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  softDelete(@Param('id') id: string) {
    return this.tourGuideService.softDelete(id);
  }
}
