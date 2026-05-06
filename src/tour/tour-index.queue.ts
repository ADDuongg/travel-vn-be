import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Types } from 'mongoose';
import {
  TOUR_INDEX_QUEUE,
  TOUR_INDEX_SYNC_JOB,
  type TourIndexSyncJobData,
  type TourIndexSyncOperation,
} from './tour-index.constants';

@Injectable()
export class TourIndexQueueService {
  private readonly logger = new Logger(TourIndexQueueService.name);

  constructor(
    @InjectQueue(TOUR_INDEX_QUEUE)
    private readonly tourIndexQueue: Queue<TourIndexSyncJobData>,
  ) {}

  /**
   * Enqueue a single-tour ES upsert/delete sync. Does not await worker completion.
   * Swallows enqueue errors so Mongo writes are not blocked when Redis is down.
   */
  async enqueue(
    tourId: string,
    operation: TourIndexSyncOperation,
    context?: { requestId?: string; eventId?: string },
  ): Promise<void> {
    if (!Types.ObjectId.isValid(tourId)) return;

    try {
      await this.tourIndexQueue.add(
        TOUR_INDEX_SYNC_JOB,
        {
          tourId,
          operation,
          requestId: context?.requestId,
          eventId: context?.eventId,
        },
        {
          jobId: `tour-es:${tourId}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 500 },
          removeOnComplete: true,
          removeOnFail: 5000,
        },
      );
    } catch (err) {
      this.logger.error(
        `Failed to enqueue tour ES sync job tourId=${tourId} operation=${operation}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
