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
  register(
    @Req()
    req: {
      user: { userId: string };
    },
    @Body() dto: CreateTourGuideDto,
  ) {
    return this.tourGuideService.register(req.user.userId, dto);
  }

  @Get('my-profile')
  getMyProfile(@Req() req: { user: { userId: string } }) {
    return this.tourGuideService.findByUserId(req.user.userId);
  }

  @Patch('my-profile')
  updateMyProfile(
    @Req()
    req: {
      user: { userId: string };
    },
    @Body() dto: UpdateTourGuideDto,
  ) {
    return this.tourGuideService.updateMyProfile(req.user.userId, dto);
  }
}
