import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schema/audit-log.schema';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AuditCategory, AuditResourceType } from './enums/audit-log.enum';

@Injectable()
export class AuditLogRepository {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async create(data: Partial<AuditLog>): Promise<void> {
    await this.auditLogModel.create(data);
  }

  async findAll(query: AuditLogQueryDto) {
    const filter = this.buildFilter(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortField = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.auditLogModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    return this.auditLogModel.findById(id).lean().exec();
  }

  async findAllForExport(query: AuditLogQueryDto) {
    const filter = this.buildFilter(query);
    const sortField = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    return this.auditLogModel
      .find(filter)
      .sort({ [sortField]: sortOrder })
      .lean()
      .exec();
  }

  async deleteExpired(category: AuditCategory, cutoff: Date): Promise<number> {
    const result = await this.auditLogModel.deleteMany({
      category,
      createdAt: { $lt: cutoff },
    });
    return result.deletedCount ?? 0;
  }

  private buildFilter(query: AuditLogQueryDto): FilterQuery<AuditLogDocument> {
    const filter: FilterQuery<AuditLogDocument> = {};

    if (query.userId) {
      filter.userId = new Types.ObjectId(query.userId);
    }
    if (
      query.category &&
      Object.values(AuditCategory).includes(query.category)
    ) {
      filter.category = query.category;
    }
    if (query.action) {
      filter.action = query.action;
    }
    if (
      query.resourceType &&
      Object.values(AuditResourceType).includes(query.resourceType)
    ) {
      filter.resourceType = query.resourceType;
    }
    if (query.ip) {
      filter.ip = query.ip;
    }

    if (query.fromDate || query.toDate) {
      filter.createdAt = {};
      if (query.fromDate) {
        filter.createdAt.$gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        filter.createdAt.$lte = new Date(query.toDate);
      }
    }

    return filter;
  }
}
