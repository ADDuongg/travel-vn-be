import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Favorite, FavoriteDocument } from './schema/favorite.schema';
import { FavoriteEntityType } from './favorite.types';

@Injectable()
export class FavoriteRepository {
  constructor(
    @InjectModel(Favorite.name)
    private readonly favoriteModel: Model<FavoriteDocument>,
  ) {}

  async toggle(params: {
    userId: Types.ObjectId;
    entityType: FavoriteEntityType;
    entityId: Types.ObjectId;
  }): Promise<{ isFavorited: boolean }> {
    const { userId, entityType, entityId } = params;

    const deleted = await this.favoriteModel
      .findOneAndDelete({ userId, entityType, entityId })
      .lean()
      .exec();

    if (deleted) return { isFavorited: false };

    try {
      await this.favoriteModel.create({ userId, entityType, entityId });
      return { isFavorited: true };
    } catch (err: any) {
      if (err?.code === 11000) return { isFavorited: true };
      throw err;
    }
  }

  async findByUser(params: {
    userId: Types.ObjectId;
    entityType?: FavoriteEntityType;
    page: number;
    limit: number;
  }) {
    const { userId, entityType, page, limit } = params;
    const filter: Record<string, unknown> = { userId };
    if (entityType) filter.entityType = entityType;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.favoriteModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.favoriteModel.countDocuments(filter),
    ]);

    return { data, total };
  }

  async exists(params: {
    userId: Types.ObjectId;
    entityType: FavoriteEntityType;
    entityId: Types.ObjectId;
  }): Promise<boolean> {
    const { userId, entityType, entityId } = params;
    const doc = await this.favoriteModel
      .findOne({ userId, entityType, entityId })
      .select('_id')
      .lean()
      .exec();
    return Boolean(doc?._id);
  }

  async adminFindAll(params: {
    userId?: Types.ObjectId;
    entityType?: FavoriteEntityType;
    entityId?: Types.ObjectId;
    page: number;
    limit: number;
  }) {
    const { userId, entityType, entityId, page, limit } = params;
    const filter: Record<string, unknown> = {};
    if (userId) filter.userId = userId;
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = entityId;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.favoriteModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.favoriteModel.countDocuments(filter),
    ]);

    return { data, total };
  }

  async findByUserAndEntities(params: {
    userId: Types.ObjectId;
    pairs: Array<{ entityType: FavoriteEntityType; entityId: Types.ObjectId }>;
  }): Promise<
    Array<{ entityType: FavoriteEntityType; entityId: Types.ObjectId }>
  > {
    const { userId, pairs } = params;
    if (!pairs.length) return [];

    const or = pairs.map((p) => ({
      entityType: p.entityType,
      entityId: p.entityId,
    }));
    const docs = await this.favoriteModel
      .find({ userId, $or: or })
      .select('entityType entityId')
      .lean()
      .exec();

    return docs.map((d) => ({
      entityType: d.entityType,
      entityId: d.entityId,
    }));
  }
}
