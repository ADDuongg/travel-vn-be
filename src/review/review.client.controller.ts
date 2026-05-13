import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { DomainException, NotFoundDomainException, ForbiddenDomainException } from 'src/common/exceptions';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AuditLog } from 'src/audit-log/decorators/audit-log.decorator';
import { AuditResourceType } from 'src/audit-log/enums/audit-log.enum';
import { CrudAuditInterceptor } from 'src/audit-log/interceptors/crud-audit.interceptor';
import { ReviewService } from './review.service';
import { ReviewEntityType } from './schema/ewview.schema';
import { parseStatusCsv } from './review.util';

@ApiBearerAuth()
@ApiTags('Client · Reviews')
@UseGuards(JwtAuthGuard)
@UseInterceptors(CrudAuditInterceptor)
@Controller('client/reviews')
export class ReviewClientController {
  constructor(private readonly reviewService: ReviewService) {}

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

  @Post()
  @AuditLog(AuditResourceType.REVIEW)
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

  @Delete(':id')
  @AuditLog(AuditResourceType.REVIEW)
  remove(@Param('id') id: string, @Req() req: { user?: { userId: string } }) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new DomainException('Unauthorized', 400, 'BAD_REQUEST', 'review.bad_request');
    }
    return this.reviewService.softDeleteOwnReview(id, userId);
  }
}
