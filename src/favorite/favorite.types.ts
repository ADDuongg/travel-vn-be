import { Types } from 'mongoose';

export enum FavoriteEntityType {
  TOUR = 'TOUR',
  ROOM = 'ROOM',
  HOTEL = 'HOTEL',
  GUIDE = 'GUIDE',
}

export type FavoriteEntitySummary = {
  id: string;
  type: FavoriteEntityType;
  slug?: string;
  name: string;
  thumbnailUrl: string;
  ratingSummary?: { average: number; total: number };
};

export type FavoriteEntityPair = {
  entityType: FavoriteEntityType;
  entityId: Types.ObjectId;
};

