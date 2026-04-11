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
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewEntityType } from './schema/ewview.schema';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

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
  @Get('me')
  findMyReview(
    @Query('entityType') entityType: ReviewEntityType,
    @Query('entityId') entityId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.userId;
    console.log('req.user', req.user);

    if (!userId) return null;

    return this.reviewService.findMyReview({
      entityType,
      entityId,
      userId,
    });
  }

  @Get('admin')
  findAll(
    @Query('entityType') entityType?: ReviewEntityType,
    @Query('isApproved') isApproved?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewService.adminFindAll({
      entityType,
      isApproved: isApproved === undefined ? undefined : isApproved === 'true',
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
    @Req() req: any,
  ) {
    console.log('req', req.user);

    return this.reviewService.upsertReview({
      ...body,
      userId: req.user?.userId,
    });
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.reviewService.approveReview(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reviewService.removeReview(id);
  }
}
