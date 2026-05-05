import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { estypes } from '@elastic/elasticsearch';
import { Model, Types } from 'mongoose';
import { ElasticsearchConnectionService } from 'src/elasticsearch/elasticsearch-connection.service';
import { EnvService } from 'src/env/env.service';
import { TourQueryDto, TourSortBy } from './dto/tour-query.dto';
import { Tour, TourDocument } from './schema/tour.schema';

function esTextField(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

const TOUR_INDEX_MAPPINGS = {
  properties: {
    /** Mongo _id as hex — used for stable sort (ES 8+ disallows sorting on meta _id). */
    tourId: { type: 'keyword' as const },
    isActive: { type: 'boolean' as const },
    slug: { type: 'keyword' as const },
    code: { type: 'text' as const, analyzer: 'standard' },
    tourType: { type: 'keyword' as const },
    destinationProvinceIds: { type: 'keyword' as const },
    departureProvinceId: { type: 'keyword' as const },
    durationDays: { type: 'integer' as const },
    durationNights: { type: 'integer' as const },
    basePrice: { type: 'double' as const },
    currency: { type: 'keyword' as const },
    difficulty: { type: 'keyword' as const },
    transportTypes: { type: 'keyword' as const },
    ratingAverage: { type: 'double' as const },
    ratingTotal: { type: 'integer' as const },
    createdAt: { type: 'date' as const },
    nameVi: { type: 'text' as const, analyzer: 'standard' },
    nameEn: { type: 'text' as const, analyzer: 'standard' },
    shortDescriptionVi: { type: 'text' as const, analyzer: 'standard' },
    shortDescriptionEn: { type: 'text' as const, analyzer: 'standard' },
  },
};

@Injectable()
export class TourSearchService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TourSearchService.name);
  private indexReady = false;

  constructor(
    private readonly esConn: ElasticsearchConnectionService,
    private readonly env: EnvService,
    @InjectModel(Tour.name)
    private readonly tourModel: Model<TourDocument>,
  ) {}

  isUsable(): boolean {
    return this.esConn.isEnabled() && this.esConn.getClientOrNull() !== null;
  }

  /** True when ES is connected and the tours index has been ensured (ready for list/search). */
  canServeSearch(): boolean {
    return this.isUsable() && this.indexReady;
  }

  private getIndex(): string {
    return this.env.get('ELASTICSEARCH_TOURS_INDEX');
  }

  async onApplicationBootstrap(): Promise<void> {
    if (!this.isUsable()) return;
    try {
      await this.ensureToursIndex();
      this.indexReady = true;
    } catch (err) {
      this.logger.error(
        'Failed to ensure Elasticsearch tours index',
        err instanceof Error ? err.stack : String(err),
      );
      this.indexReady = false;
    }
  }

  private assertReady(): void {
    if (!this.isUsable() || !this.indexReady) {
      throw new Error('Elasticsearch tours index is not ready');
    }
  }

  async ensureToursIndex(): Promise<void> {
    const client = this.esConn.getClient();
    const index = this.getIndex();
    const exists = await client.indices.exists({ index });
    if (exists) {
      try {
        await client.indices.putMapping({
          index,
          properties: {
            tourId: { type: 'keyword' },
          },
        });
      } catch {
        // Field may already exist or mapping conflict — safe to ignore
      }
      return;
    }

    await client.indices.create({
      index,
      mappings: TOUR_INDEX_MAPPINGS,
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
      },
    });
    this.logger.log(`Created Elasticsearch index: ${index}`);
  }

  tourDocumentFromLean(tour: Record<string, unknown>): Record<string, unknown> {
    const destinations =
      (tour.destinations as Array<{ provinceId: unknown }>) ?? [];
    const destinationProvinceIds = destinations.map((d) =>
      String(d.provinceId),
    );
    const tr =
      (tour.translations as Record<string, Record<string, unknown>>) ?? {};
    const vi = tr.vi ?? {};
    const en = tr.en ?? {};
    const pricing = (tour.pricing as Record<string, unknown>) ?? {};
    const duration = (tour.duration as Record<string, number>) ?? {};
    const rating = (tour.ratingSummary as Record<string, number>) ?? {};

    const rawId = tour._id;
    let tourId = '';
    try {
      tourId = new Types.ObjectId(
        rawId as Types.ObjectId | string,
      ).toHexString();
    } catch {
      tourId = '';
    }

    return {
      tourId,
      isActive: tour.isActive === true,
      slug: esTextField(tour.slug),
      code: esTextField(tour.code),
      tourType: esTextField(tour.tourType),
      destinationProvinceIds,
      departureProvinceId: String(tour.departureProvinceId),
      durationDays: duration.days ?? 0,
      durationNights: duration.nights ?? 0,
      basePrice: Number(pricing.basePrice ?? 0),
      currency: esTextField(pricing.currency) || 'VND',
      difficulty: esTextField(tour.difficulty) || 'MODERATE',
      transportTypes: (tour.transportTypes as string[]) ?? [],
      ratingAverage: Number(rating.average ?? 0),
      ratingTotal: Number(rating.total ?? 0),
      createdAt: tour.createdAt
        ? new Date(tour.createdAt as string | Date).toISOString()
        : new Date(0).toISOString(),
      nameVi: esTextField(vi.name),
      nameEn: esTextField(en.name),
      shortDescriptionVi: esTextField(vi.shortDescription),
      shortDescriptionEn: esTextField(en.shortDescription),
    };
  }

  async upsertFromMongo(tourId: string): Promise<void> {
    if (!this.isUsable()) return;

    if (!Types.ObjectId.isValid(tourId)) return;

    const tour = await this.tourModel.findById(tourId).lean();
    const client = this.esConn.getClient();
    const index = this.getIndex();

    if (!tour) {
      try {
        await client.delete({ index, id: tourId, refresh: true });
      } catch {
        // ignore missing document
      }
      return;
    }

    const body = this.tourDocumentFromLean(tour as Record<string, unknown>);
    await client.index({
      index,
      id: tourId,
      document: body,
      refresh: true,
    });
  }

  async search(query: TourQueryDto): Promise<{ ids: string[]; total: number }> {
    this.assertReady();
    const client = this.esConn.getClient();
    const index = this.getIndex();

    const {
      page = 1,
      limit = 12,
      destinationId,
      departureProvinceId,
      tourType,
      minDays,
      maxDays,
      minPrice,
      maxPrice,
      difficulty,
      sortBy = TourSortBy.NEWEST,
      search,
      transportTypes,
    } = query;

    const filter: object[] = [{ term: { isActive: true } }];

    if (destinationId && Types.ObjectId.isValid(destinationId)) {
      filter.push({ term: { destinationProvinceIds: destinationId } });
    }

    if (departureProvinceId && Types.ObjectId.isValid(departureProvinceId)) {
      filter.push({ term: { departureProvinceId } });
    }

    if (tourType) {
      filter.push({ term: { tourType } });
    }

    if (minDays != null || maxDays != null) {
      const range: Record<string, number> = {};
      if (minDays != null) range.gte = minDays;
      if (maxDays != null) range.lte = maxDays;
      filter.push({ range: { durationDays: range } });
    }

    if (minPrice != null || maxPrice != null) {
      const range: Record<string, number> = {};
      if (minPrice != null) range.gte = minPrice;
      if (maxPrice != null) range.lte = maxPrice;
      filter.push({ range: { basePrice: range } });
    }

    if (difficulty) {
      filter.push({ term: { difficulty } });
    }

    if (transportTypes && transportTypes.length > 0) {
      filter.push({ terms: { transportTypes } });
    }

    const must: object[] = [];
    if (search && search.trim().length > 0) {
      must.push({
        multi_match: {
          query: search.trim(),
          fields: [
            'nameVi^2',
            'nameEn^2',
            'code',
            'shortDescriptionVi',
            'shortDescriptionEn',
          ],
          type: 'best_fields',
          operator: 'or',
          fuzziness: 'AUTO',
        },
      });
    }

    const sort = this.buildSort(sortBy);

    const from = (page - 1) * limit;
    const size = limit;

    const res = await client.search({
      index,
      track_total_hits: true,
      from,
      size,
      query: {
        bool: {
          filter,
          ...(must.length ? { must } : {}),
        },
      },
      sort,
      _source: false,
    });

    const total =
      typeof res.hits.total === 'number'
        ? res.hits.total
        : (res.hits.total?.value ?? 0);

    const ids = res.hits.hits?.map((h) => String(h._id)).filter(Boolean) ?? [];

    return { ids, total };
  }

  private buildSort(sortBy: TourSortBy): estypes.Sort {
    const tieBreak: estypes.SortCombinations = { tourId: 'asc' };
    switch (sortBy) {
      case TourSortBy.PRICE_ASC:
        return [{ basePrice: 'asc' }, tieBreak];
      case TourSortBy.PRICE_DESC:
        return [{ basePrice: 'desc' }, tieBreak];
      case TourSortBy.DURATION_ASC:
        return [{ durationDays: 'asc' }, tieBreak];
      case TourSortBy.DURATION_DESC:
        return [{ durationDays: 'desc' }, tieBreak];
      case TourSortBy.RATING:
        return [{ ratingAverage: 'desc' }, { ratingTotal: 'desc' }, tieBreak];
      case TourSortBy.NEWEST:
      default:
        return [{ createdAt: 'desc' }, tieBreak];
    }
  }

  async reindexAll(): Promise<{ indexed: number }> {
    if (!this.isUsable()) {
      throw new Error('Elasticsearch is not enabled or not connected');
    }
    await this.ensureToursIndex();
    const client = this.esConn.getClient();
    const index = this.getIndex();
    let indexed = 0;
    const batchSize = 200;
    let batch: object[] = [];

    const cursor = this.tourModel.find({}).lean().cursor();

    for await (const doc of cursor) {
      const id = new Types.ObjectId(
        (doc as unknown as { _id: Types.ObjectId | string })._id,
      ).toHexString();
      batch.push({ index: { _index: index, _id: id } });
      batch.push(this.tourDocumentFromLean(doc as Record<string, unknown>));

      if (batch.length >= batchSize * 2) {
        const res = await client.bulk({
          refresh: false,
          operations: batch,
        });
        if (res.errors) {
          throw new Error(
            `Bulk index errors (first items): ${JSON.stringify(res.items?.slice(0, 3))}`,
          );
        }
        indexed += batch.length / 2;
        batch = [];
      }
    }

    if (batch.length) {
      const res = await client.bulk({
        refresh: true,
        operations: batch,
      });
      if (res.errors) {
        throw new Error(
          `Bulk index errors (first items): ${JSON.stringify(res.items?.slice(0, 3))}`,
        );
      }
      indexed += batch.length / 2;
    } else {
      await client.indices.refresh({ index });
    }

    this.logger.log(`Reindex tours completed: ${indexed} documents`);
    return { indexed };
  }
}
