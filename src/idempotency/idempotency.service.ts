import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Idempotency,
  IdempotencyDocument,
  IdempotencyStatus,
} from './schema/idempotency.schema';
import {
  IDEMPOTENCY_FAILED_TTL_MS,
  IDEMPOTENCY_HTTP_COMPLETED_TTL_MS,
  IDEMPOTENCY_JOB_COMPLETED_TTL_MS,
  IDEMPOTENCY_JOB_FAILED_TTL_MS,
  IDEMPOTENCY_PROCESSING_MAX_MS,
} from './idempotency.constants';

@Injectable()
export class IdempotencyService {
  constructor(
    @InjectModel(Idempotency.name)
    private readonly idempotencyModel: Model<IdempotencyDocument>,
  ) {}

  /* use with HTTP request */
  async execute<T>(
    key: string,
    userId: string,
    endpoint: string,
    handler: () => Promise<T>,
  ): Promise<T> {
    try {
      await this.idempotencyModel.create({
        key,
        userId,
        endpoint,
        status: IdempotencyStatus.PROCESSING,
        expireAt: new Date(Date.now() + IDEMPOTENCY_PROCESSING_MAX_MS),
      });
    } catch (error: any) {
      // Mongo duplicate key error
      if (error.code === 11000) {
        const existing = await this.idempotencyModel.findOne({
          key,
          userId,
        });

        if (!existing) {
          throw new ConflictException('Idempotency record not found');
        }

        if (existing.status === IdempotencyStatus.COMPLETED) {
          return existing.response;
        }

        throw new ConflictException('Request is being processed');
      }

      throw error;
    }

    try {
      const result = await handler();

      await this.idempotencyModel.updateOne(
        { key, userId },
        {
          status: IdempotencyStatus.COMPLETED,
          response: result,
          expireAt: new Date(Date.now() + IDEMPOTENCY_HTTP_COMPLETED_TTL_MS),
        },
      );

      return result;
    } catch (error) {
      // cleanup nếu business fail
      await this.idempotencyModel.updateOne(
        { key, userId },
        {
          status: IdempotencyStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown error',
          expireAt: new Date(Date.now() + IDEMPOTENCY_FAILED_TTL_MS),
        },
      );

      throw error;
    }
  }

  /**
   * Run a job handler at most once per (jobId, jobName).
   * Used by Bull workers: on success mark COMPLETED so retries skip; on failure delete so retry can run again.
   */
  /* use with BullMQ job and something like background job */
  async executeJobOnce(
    jobId: string,
    jobName: string,
    handler: () => Promise<void>,
  ): Promise<void> {
    const key = jobId;
    const userId = 'bull-notification';
    const endpoint = jobName;

    try {
      await this.idempotencyModel.create({
        key,
        userId,
        endpoint,
        status: IdempotencyStatus.PROCESSING,
        expireAt: new Date(Date.now() + IDEMPOTENCY_PROCESSING_MAX_MS),
      });
    } catch (error: any) {
      // duplicate key
      if (error.code === 11000) {
        const existing = await this.idempotencyModel.findOne({
          key,
          userId,
          endpoint,
        });

        if (!existing) {
          return;
        }

        if (existing.status === IdempotencyStatus.COMPLETED) {
          return;
        }

        if (existing.status === IdempotencyStatus.PROCESSING) {
          // another worker processing
          return;
        }

        if (existing.status === IdempotencyStatus.FAILED) {
          return;
        }

        return;
      }

      throw error;
    }

    try {
      await handler();

      await this.idempotencyModel.updateOne(
        { key, userId, endpoint },
        {
          status: IdempotencyStatus.COMPLETED,
          expireAt: new Date(Date.now() + IDEMPOTENCY_JOB_COMPLETED_TTL_MS),
        },
      );
    } catch (error) {
      await this.idempotencyModel.updateOne(
        { key, userId, endpoint },
        {
          status: IdempotencyStatus.FAILED,
          expireAt: new Date(Date.now() + IDEMPOTENCY_JOB_FAILED_TTL_MS),
        },
      );

      throw error;
    }
  }
}
