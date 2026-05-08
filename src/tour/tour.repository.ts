import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, SortOrder, Types } from 'mongoose';
import { Tour, TourDocument } from './schema/tour.schema';

@Injectable()
export class TourRepository {
  constructor(
    @InjectModel(Tour.name)
    private readonly tourModel: Model<TourDocument>,
  ) {}

  findOneBySlug(slug: string) {
    return this.tourModel.findOne({ slug }).exec();
  }

  findOneByCode(code: string) {
    return this.tourModel.findOne({ code }).exec();
  }

  create(data: Partial<Tour>) {
    return this.tourModel.create(data);
  }

  async findManyByIdsOrderedPopulate(ids: Types.ObjectId[]) {
    if (!ids.length) return [];
    const rows = await this.tourModel
      .find({ _id: { $in: ids } })
      .populate('destinations.provinceId', 'name code slug fullName')
      .populate('departureProvinceId', 'name code slug fullName')
      .populate('amenities')
      .lean();
    const rank = new Map(ids.map((id, i) => [id.toString(), i]));
    rows.sort(
      (a, b) => (rank.get(String(a._id)) ?? 0) - (rank.get(String(b._id)) ?? 0),
    );
    return rows;
  }

  async findPageMongo(params: {
    filter: FilterQuery<TourDocument>;
    sort: Record<string, SortOrder>;
    skip: number;
    limit: number;
  }) {
    const { filter, sort, skip, limit } = params;
    return Promise.all([
      this.tourModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('destinations.provinceId', 'name code slug fullName')
        .populate('departureProvinceId', 'name code slug fullName')
        .populate('amenities')
        .lean(),
      this.tourModel.countDocuments(filter),
    ]);
  }

  findByIdPopulated(id: string) {
    return this.tourModel
      .findById(id)
      .populate('destinations.provinceId', 'name code slug fullName')
      .populate('departureProvinceId', 'name code slug fullName')
      .populate('amenities')
      .exec();
  }

  findOneActiveBySlug(slug: string) {
    return this.tourModel
      .findOne({ slug, isActive: true })
      .populate('destinations.provinceId', 'name code slug fullName')
      .populate('departureProvinceId', 'name code slug fullName')
      .populate('amenities')
      .exec();
  }

  findById(id: string) {
    return this.tourModel.findById(id).exec();
  }

  findActiveForOptions(filter: FilterQuery<TourDocument>) {
    return this.tourModel
      .find(filter)
      .select('_id slug code translations duration pricing')
      .sort({ 'translations.vi.name': 1 })
      .lean();
  }

  findFeatured(limit: number) {
    return this.tourModel
      .find({ isActive: true })
      .sort({ 'ratingSummary.average': -1, 'ratingSummary.total': -1 })
      .limit(limit)
      .populate('destinations.provinceId', 'name code slug')
      .populate('departureProvinceId', 'name code slug')
      .lean();
  }

  findByIdLean(tourId: string) {
    return this.tourModel.findById(tourId).lean().exec();
  }

  /** Cursor for bulk ES reindex */
  streamAllLean() {
    return this.tourModel.find({}).lean().cursor();
  }
}
