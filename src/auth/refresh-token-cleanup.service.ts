import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RefreshToken } from './schema/refresh_token.schema';

@Injectable()
export class RefreshTokenCleanupService {
  private readonly logger = new Logger(RefreshTokenCleanupService.name);

  constructor(
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshToken>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async purgeExpiredRefreshTokens() {
    const now = new Date();

    const result = await this.refreshTokenModel.deleteMany({
      $or: [
        { keepUntil: { $lt: now } },
        { expiresAt: { $lt: now }, keepUntil: null },
      ],
    });

    if (result.deletedCount > 0) {
      this.logger.log(
        `Refresh token purge: removed ${result.deletedCount} row(s) (keepUntil < now or legacy without keepUntil and expired)`,
      );
    }
  }
}
