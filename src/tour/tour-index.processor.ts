import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import type { Counter } from 'prom-client';
import {
  TOUR_INDEX_QUEUE,
  TOUR_INDEX_SYNC_JOB,
  type TourIndexSyncJobData,
} from './tour-index.constants';
import { TourSearchService } from './tour-search.service';
import { ES_SYNC_FAILED_TOTAL, ES_SYNC_SUCCESS_TOTAL } from './tour-es.metrics';

@Processor(TOUR_INDEX_QUEUE)
export class TourIndexProcessor extends WorkerHost {
  private readonly logger = new Logger(TourIndexProcessor.name);

  constructor(
    private readonly tourSearch: TourSearchService,
    @InjectMetric(ES_SYNC_SUCCESS_TOTAL)
    private readonly syncSuccessTotal: Counter<string>,
    @InjectMetric(ES_SYNC_FAILED_TOTAL)
    private readonly syncFailedTotal: Counter<string>,
  ) {
    super();
  }

  async process(job: Job<TourIndexSyncJobData>): Promise<void> {
    if (job.name !== TOUR_INDEX_SYNC_JOB) {
      this.logger.warn(`Ignoring unknown job name: ${job.name}`);
      return;
    }

    const { tourId, operation, requestId, eventId } = job.data;
    try {
      await this.tourSearch.upsertFromMongo(tourId);
      this.syncSuccessTotal.inc({ operation });
      this.logger.log({
        requestId,
        eventId,
        tourId,
        operation,
        jobId: job.id,
        message: 'Tour ES sync completed',
      });
    } catch (err) {
      const maxAttempts = job.opts.attempts ?? 3;
      const attempt = job.attemptsMade + 1;
      const isLastAttempt = attempt >= maxAttempts;

      if (isLastAttempt) {
        this.syncFailedTotal.inc({ operation });
        this.logger.error(
          {
            requestId,
            eventId,
            tourId,
            operation,
            attempt,
            maxAttempts,
            jobId: job.id,
            message: err instanceof Error ? err.message : String(err),
          },
          'Tour ES sync exhausted retries',
        );
      } else {
        this.logger.warn({
          requestId,
          eventId,
          tourId,
          operation,
          attempt,
          maxAttempts,
          jobId: job.id,
          message: err instanceof Error ? err.message : String(err),
        });
      }
      throw err;
    }
  }
}
