import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Query,
  Param,
  Req,
  Delete,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewEntityType, ReviewStatus } from './schema/ewview.schema';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { Roles, RolesGuard } from 'src/guards/role.guard';
import { AdminReviewStatusDto } from './dto/admin-review-status.dto';

function parseStatusCsv(q?: string): ReviewStatus[] | undefined {
  if (!q?.trim()) return undefined;
  const parts = q
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed = new Set(Object.values(ReviewStatus));
  const out: ReviewStatus[] = [];
  for (const p of parts) {
    if (!allowed.has(p as ReviewStatus)) {
      throw new BadRequestException(`Invalid status: ${p}`);
    }
    out.push(p as ReviewStatus);
  }
  return out.length ? out : undefined;
}

@Controller('/api/v1/reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  findPublic(
    @Query('entityType') entityType: ReviewEntityType,
    @Query('entityId') entityId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewService.findPublicReviews({
      entityType,
      entityId,
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/list')
  findMyReviewsList(
    @Req() req: { user?: { userId: string } },
    @Query('entityType') entityType?: ReviewEntityType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') statusCsv?: string,
    @Query('lang') lang?: string,
  ) {
    const userId = req.user?.userId;
    if (!userId) {
      return {
        data: [],
        pagination: { page: 1, limit: 20, total: 0 },
      };
    }

    const status = parseStatusCsv(statusCsv);

    return this.reviewService.findMyReviewsList({
      userId,
      entityType,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      status,
      lang: lang?.trim(),
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMyReview(
    @Query('entityType') entityType: ReviewEntityType,
    @Query('entityId') entityId: string,
    @Req() req: { user?: { userId: string } },
  ) {
    const userId = req.user?.userId;

    if (!userId) return null;

    return this.reviewService.findMyReview({
      entityType,
      entityId,
      userId,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  @Get('admin')
  findAll(
    @Query('entityType') entityType?: ReviewEntityType,
    @Query('status') statusCsv?: string,
    @Query('includeDeleted') includeDeleted?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const status = parseStatusCsv(statusCsv);
    return this.reviewService.adminFindAll({
      entityType,
      status,
      includeDeleted: includeDeleted === 'true',
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  upsert(
    @Body()
    body: {
      entityType: ReviewEntityType;
      entityId: string;
      rating?: number;
      comment?: string;
      isAnonymous?: boolean;
    },
    @Req() req: { user?: { userId: string } },
  ) {
    return this.reviewService.upsertReview({
      ...body,
      userId: req.user?.userId,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  @Patch(':id/approve')
  approve(@Param('id') id: string, @Req() req: { user?: { userId: string } }) {
    const adminId = req.user?.userId;
    if (!adminId) {
      throw new BadRequestException('Admin user id missing');
    }
    return this.reviewService.approveReview(id, adminId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(['admin'])
  @Patch(':id/status')
  setStatus(
    @Param('id') id: string,
    @Body() body: AdminReviewStatusDto,
    @Req() req: { user?: { userId: string } },
  ) {
    const adminId = req.user?.userId;
    if (!adminId) {
      throw new BadRequestException('Admin user id missing');
    }
    return this.reviewService.setReviewStatusByAdmin(id, adminId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: { user?: { userId: string } }) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Unauthorized');
    }
    return this.reviewService.softDeleteOwnReview(id, userId);
  }
}
