import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Review, ReviewDocument } from './schema/ewview.schema';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

@Injectable()
export class ReviewSoftDeleteCleanupService {
  private readonly logger = new Logger(ReviewSoftDeleteCleanupService.name);

  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_5AM)
  async purgeOldSoftDeletedReviews() {
    const cutoff = new Date(Date.now() - NINETY_DAYS_MS);
    const result = await this.reviewModel.deleteMany({
      deletedAt: { $ne: null, $lt: cutoff },
    });

    if (result.deletedCount > 0) {
      this.logger.log(
        `Review soft-delete purge: hard-deleted ${result.deletedCount} document(s) (deletedAt < ${cutoff.toISOString()})`,
      );
    }
  }
}
