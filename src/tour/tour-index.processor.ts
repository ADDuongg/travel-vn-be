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

  private jobCtx(job: Job<TourIndexSyncJobData>) {
    const maxAttempts = job.opts.attempts ?? 3;
    return {
      queueName: TOUR_INDEX_QUEUE,
      jobId: job.id,
      jobName: job.name,
      attempt: job.attemptsMade + 1,
      maxAttempts,
    };
  }

  async process(job: Job<TourIndexSyncJobData>): Promise<void> {
    if (job.name !== TOUR_INDEX_SYNC_JOB) {
      this.logger.warn({
        queueName: TOUR_INDEX_QUEUE,
        jobId: job.id,
        jobName: job.name,
        message: `Ignoring unknown job name: ${job.name}`,
      });
      return;
    }

    const { tourId, operation, requestId, eventId } = job.data;
    const meta = this.jobCtx(job);
    const startedMs = Date.now();
    try {
      await this.tourSearch.upsertFromMongo(tourId);
      this.syncSuccessTotal.inc({ operation });
      this.logger.log({
        ...meta,
        requestId,
        eventId,
        tourId,
        operation,
        durationMs: Date.now() - startedMs,
        message: 'Tour ES sync completed',
      });
    } catch (err) {
      const isLastAttempt = meta.attempt >= meta.maxAttempts;

      if (isLastAttempt) {
        this.syncFailedTotal.inc({ operation });
        this.logger.error(
          {
            ...meta,
            requestId,
            eventId,
            tourId,
            operation,
            durationMs: Date.now() - startedMs,
            err,
            message: err instanceof Error ? err.message : String(err),
          },
          'Tour ES sync exhausted retries',
        );
      } else {
        this.logger.warn({
          ...meta,
          requestId,
          eventId,
          tourId,
          operation,
          durationMs: Date.now() - startedMs,
          message: err instanceof Error ? err.message : String(err),
        });
      }
      throw err;
    }
  }
}
