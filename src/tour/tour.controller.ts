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
  UploadedFiles,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { TourService } from './tour.service';
import { TourInventoryService } from 'src/tour-inventory/tour-inventory.service';
import { CreateTourDto } from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { TourQueryDto } from './dto/tour-query.dto';
import { ParseFormDataJsonPipe } from 'src/common/pipes/parse-form-data-json.pipe';
import { JwtOptionalAuthGuard } from 'src/guards/jwt-optional-auth.guard';

@Controller('api/v1/tours')
export class TourController {
  constructor(
    private readonly tourService: TourService,
    private readonly tourInventoryService: TourInventoryService,
  ) {}

  @Post()
  @UseInterceptors(FilesInterceptor('gallery', 10))
  create(
    @Body(new ParseFormDataJsonPipe()) dto: CreateTourDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.tourService.create(dto, files);
  }

  @Get()
  @UseGuards(JwtOptionalAuthGuard)
  findAll(@Query() query: TourQueryDto, @Req() req: { user?: { userId: string } }) {
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
  findBySlug(@Param('slug') slug: string, @Req() req: { user?: { userId: string } }) {
    return this.tourService.findBySlug(slug, req.user?.userId);
  }

  @Get(':id/availability')
  getAvailability(@Param('id') id: string, @Query('month') month?: string) {
    const m = month ?? new Date().toISOString().slice(0, 7);
    return this.tourInventoryService.getAvailabilityByMonth(id, m);
  }

  @Get(':id')
  @UseGuards(JwtOptionalAuthGuard)
  findById(@Param('id') id: string, @Req() req: { user?: { userId: string } }) {
    return this.tourService.findById(id, req.user?.userId);
  }

  @Patch(':id')
  @UseInterceptors(FilesInterceptor('gallery', 10))
  update(
    @Param('id') id: string,
    @Body(new ParseFormDataJsonPipe()) dto: UpdateTourDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.tourService.update(id, dto, files);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.tourService.delete(id);
  }
}
