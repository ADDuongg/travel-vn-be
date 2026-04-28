import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CrudAuditInterceptor } from 'src/audit-log/interceptors/crud-audit.interceptor';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { CreateTourGuideDto } from './dto/create-tour-guide.dto';
import { UpdateTourGuideDto } from './dto/update-tour-guide.dto';
import { TourGuideService } from './tour-guide.service';

@ApiBearerAuth()
@ApiTags('Client · Tour guides')
@UseGuards(JwtAuthGuard)
@UseInterceptors(CrudAuditInterceptor)
@Controller('client/tour-guides')
export class TourGuideClientController {
  constructor(private readonly tourGuideService: TourGuideService) {}

  @Post('register')
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

  @Get('my-profile')
  getMyProfile(@Req() req: { user: { userId: string } }) {
    return this.tourGuideService.findByUserId(req.user.userId);
  }

  @Patch('my-profile')
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
}
