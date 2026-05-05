import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Types } from 'mongoose';
import { TourIndexQueueService } from './tour-index.queue';
import { TOUR_INDEX_QUEUE, TOUR_INDEX_SYNC_JOB } from './tour-index.constants';

describe('TourIndexQueueService', () => {
  it('enqueue calls queue.add with retries and jobId', async () => {
    const add = jest.fn().mockResolvedValue(undefined);
    const moduleRef = await Test.createTestingModule({
      providers: [
        TourIndexQueueService,
        {
          provide: getQueueToken(TOUR_INDEX_QUEUE),
          useValue: { add },
        },
      ],
    }).compile();

    const svc = moduleRef.get(TourIndexQueueService);
    const tourId = new Types.ObjectId().toHexString();
    await svc.enqueue(tourId, 'create');

    expect(add).toHaveBeenCalledWith(
      TOUR_INDEX_SYNC_JOB,
      { tourId, operation: 'create' },
      expect.objectContaining({
        jobId: `tour-es:${tourId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 500 },
        removeOnComplete: true,
        removeOnFail: 5000,
      }),
    );
  });

  it('enqueue skips invalid tourId', async () => {
    const add = jest.fn();
    const moduleRef = await Test.createTestingModule({
      providers: [
        TourIndexQueueService,
        {
          provide: getQueueToken(TOUR_INDEX_QUEUE),
          useValue: { add },
        },
      ],
    }).compile();

    const svc = moduleRef.get(TourIndexQueueService);
    await svc.enqueue('not-an-objectid', 'update');
    expect(add).not.toHaveBeenCalled();
  });
});
