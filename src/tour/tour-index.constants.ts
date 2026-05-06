export const TOUR_INDEX_SYNC_EVENT = 'tour.index.sync';

/** BullMQ queue name for async tour document sync to Elasticsearch */
export const TOUR_INDEX_QUEUE = 'tour-index';

/** Job name inside the tour-index queue */
export const TOUR_INDEX_SYNC_JOB = 'tour-index-sync';

export type TourIndexSyncOperation =
  | 'create'
  | 'update'
  | 'delete'
  | 'rating_recalc';

export interface TourIndexSyncJobData {
  tourId: string;
  operation: TourIndexSyncOperation;
  requestId?: string;
  eventId?: string;
}

export class TourIndexSyncPayload {
  constructor(
    public readonly tourId: string,
    public readonly requestId?: string,
    public readonly eventId?: string,
  ) {}
}
