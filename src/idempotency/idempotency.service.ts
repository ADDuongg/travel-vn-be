import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Idempotency,
  IdempotencyDocument,
  IdempotencyStatus,
} from './schema/idempotency.schema';
import {
  IDEMPOTENCY_HTTP_COMPLETED_TTL_MS,
  IDEMPOTENCY_JOB_COMPLETED_TTL_MS,
  IDEMPOTENCY_PROCESSING_MAX_MS,
} from './idempotency.constants';

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
      expireAt: new Date(Date.now() + IDEMPOTENCY_PROCESSING_MAX_MS),
    });

    const result = await handler();

    await this.idempotencyModel.updateOne(
      { key, userId },
      {
        status: 'COMPLETED',
        response: result,
        expireAt: new Date(Date.now() + IDEMPOTENCY_HTTP_COMPLETED_TTL_MS),
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
      expireAt: new Date(Date.now() + IDEMPOTENCY_PROCESSING_MAX_MS),
    });

    try {
      await handler();
      await this.idempotencyModel.updateOne(
        { key, userId, endpoint },
        {
          status: IdempotencyStatus.COMPLETED,
          expireAt: new Date(Date.now() + IDEMPOTENCY_JOB_COMPLETED_TTL_MS),
        },
      );
    } catch (err) {
      await this.idempotencyModel.deleteOne({ key, userId, endpoint });
      throw err;
    }
  }
}
