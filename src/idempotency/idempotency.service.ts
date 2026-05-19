import { Injectable } from '@nestjs/common';
import {
  DomainException,
  NotFoundDomainException,
  ForbiddenDomainException,
} from 'src/common/exceptions';
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
      if (error.code === 11000) {
        const existing = await this.idempotencyModel.findOne({
          key,
          userId,
        });

        if (!existing) {
          throw new DomainException(
            'Idempotency record not found',
            409,
            'CONFLICT',
            'idempotency.conflict',
          );
        }

        if (existing.status === IdempotencyStatus.COMPLETED) {
          return existing.response;
        }

        throw new DomainException(
          'Request is being processed',
          409,
          'CONFLICT',
          'idempotency.conflict',
        );
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
