import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RefreshToken } from './schema/refresh_token.schema';

/**
 * Dọn document refresh token đã quá keepUntil (hoặc JWT hết hạn mà không có keepUntil — dữ liệu cũ).
 * Bổ sung cho TTL MongoDB: nếu index TTL chưa có / không chạy, cron vẫn xóa được.
 */
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
    // keepUntil < now: TTL semantics + bản ghi đã hết hạn giữ lại.
    // expiresAt < now && keepUntil null/missing: dữ liệu cũ không có keepUntil.
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
