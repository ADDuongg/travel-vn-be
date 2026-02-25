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
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
  @UseInterceptors(FileInterceptor('cv'))
  create(
    @Body() dto: CreateTourGuideDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.tourGuideService.create(dto, file);
  }

  @Post('register')
  @UseGuards(JwtAuthGuard)
  register(
    @Req() req: { user: { userId: string } },
    @Body() dto: CreateTourGuideDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.tourGuideService.register(req.user.userId, dto, file);
  }

  @Patch('my-profile')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('cv'))
  updateMyProfile(
    @Req() req: { user: { userId: string } },
    @Body() dto: UpdateTourGuideDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.tourGuideService.updateMyProfile(req.user.userId, dto, file);
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
  @UseInterceptors(FileInterceptor('cv'))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTourGuideDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.tourGuideService.update(id, dto, file);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  softDelete(@Param('id') id: string) {
    return this.tourGuideService.softDelete(id);
  }
}
