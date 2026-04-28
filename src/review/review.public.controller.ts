import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { ReviewEntityType } from './schema/ewview.schema';

@ApiTags('Public · Reviews')
@Controller('public/reviews')
export class ReviewPublicController {
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
}
