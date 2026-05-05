import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  TOUR_INDEX_SYNC_EVENT,
  TourIndexSyncPayload,
} from './tour-index.constants';
import { TourSearchService } from './tour-search.service';
import { TourIndexQueueService } from './tour-index.queue';

@Injectable()
export class TourIndexListener {
  constructor(
    private readonly tourSearch: TourSearchService,
    private readonly tourIndexQueue: TourIndexQueueService,
  ) {}

  @OnEvent(TOUR_INDEX_SYNC_EVENT)
  async handleTourIndexSync(payload: TourIndexSyncPayload): Promise<void> {
    if (!this.tourSearch.isUsable()) return;
    await this.tourIndexQueue.enqueue(payload.tourId, 'rating_recalc');
  }
}
