import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Idempotency,
  IdempotencyDocument,
  IdempotencyStatus,
} from './schema/idempotency.schema';

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectModel(Idempotency.name)
    private readonly idempotencyModel: Model<IdempotencyDocument>,
  ) {}

  async execute<T>(
    key: string,
    userId: string,
    endpoint: string,
    handler: () => Promise<T>,
  ): Promise<T> {
    const existing = await this.idempotencyModel.findOne({ key, userId });

    if (existing) {
      if (existing.status === IdempotencyStatus.COMPLETED) {
        return existing.response;
      }

      throw new ConflictException('Request is being processed');
    }

    await this.idempotencyModel.create({
      key,
      userId,
      endpoint,
      status: 'PROCESSING',
    });

    const result = await handler();

    await this.idempotencyModel.updateOne(
      { key, userId },
      {
        status: 'COMPLETED',
        response: result,
      },
    );

    return result;
  }

  /**
   * Run a job handler at most once per (jobId, jobName).
   * Used by Bull workers: on success mark COMPLETED so retries skip; on failure delete so retry can run again.
   */
  async executeJobOnce(
    jobId: string,
    jobName: string,
    handler: () => Promise<void>,
  ): Promise<void> {
    const key = jobId;
    const userId = 'bull-notification';
    const endpoint = jobName;

    const existing = await this.idempotencyModel.findOne({
      key,
      userId,
      endpoint,
    });

    if (existing?.status === IdempotencyStatus.COMPLETED) {
      return;
    }
    if (existing?.status === IdempotencyStatus.PROCESSING) {
      return; // retry overlap, skip duplicate
    }

    await this.idempotencyModel.create({
      key,
      userId,
      endpoint,
      status: IdempotencyStatus.PROCESSING,
    });

    try {
      await handler();
      await this.idempotencyModel.updateOne(
        { key, userId, endpoint },
        { status: IdempotencyStatus.COMPLETED },
      );
    } catch (err) {
      await this.idempotencyModel.deleteOne({ key, userId, endpoint });
      throw err;
    }
  }
}
