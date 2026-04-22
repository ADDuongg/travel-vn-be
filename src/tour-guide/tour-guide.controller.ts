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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { Roles, RolesGuard } from 'src/guards/role.guard';
import { TourGuideService } from './tour-guide.service';
import { CreateTourGuideDto } from './dto/create-tour-guide.dto';
import { UpdateTourGuideDto } from './dto/update-tour-guide.dto';
import { TourGuideQueryDto } from './dto/tour-guide-query.dto';
import { VerifyTourGuideDto } from './dto/verify-tour-guide.dto';
import { JwtOptionalAuthGuard } from 'src/guards/jwt-optional-auth.guard';
import { CrudAuditInterceptor } from 'src/audit-log/interceptors/crud-audit.interceptor';
import { AuditLog } from 'src/audit-log/decorators/audit-log.decorator';
import { AuditResourceType } from 'src/audit-log/enums/audit-log.enum';

@Controller('api/v1/tour-guides')
@UseInterceptors(CrudAuditInterceptor)
export class TourGuideController {
  constructor(private readonly tourGuideService: TourGuideService) {}

  @Get()
  @UseGuards(JwtOptionalAuthGuard)
  findAll(@Query() query: TourGuideQueryDto, @Req() req: { user?: { userId: string } }) {
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

  /** User tự đăng ký làm tour guide - chỉ cần JWT (đặt trước @Post() để route /register match đúng) */
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

  @Post()
  @AuditLog(AuditResourceType.TOUR_GUIDE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  verify(@Param('id') id: string, @Body() dto: VerifyTourGuideDto) {
    return this.tourGuideService.verify(id, dto.isVerified);
  }

  @Patch(':id/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  toggleAvailability(@Param('id') id: string) {
    return this.tourGuideService.toggleAvailability(id);
  }

  @Patch(':id')
  @AuditLog(AuditResourceType.TOUR_GUIDE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
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
  @AuditLog(AuditResourceType.TOUR_GUIDE)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  softDelete(@Param('id') id: string) {
    return this.tourGuideService.softDelete(id);
  }
}
