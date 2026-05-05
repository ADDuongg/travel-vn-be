import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReviewRepository } from './review.repository';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

@Injectable()
export class ReviewSoftDeleteCleanupService {
  private readonly logger = new Logger(ReviewSoftDeleteCleanupService.name);

  constructor(private readonly reviewRepository: ReviewRepository) {}

  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async purgeOldSoftDeletedReviews() {
    const cutoff = new Date(Date.now() - NINETY_DAYS_MS);
    const result = await this.reviewRepository.deleteManySoftDeletedBefore(
      cutoff,
    );

    if (result.deletedCount > 0) {
      this.logger.log(
        `Review soft-delete purge: hard-deleted ${result.deletedCount} document(s) (deletedAt < ${cutoff.toISOString()})`,
      );
    }
  }
}
