import { Injectable } from '@nestjs/common';
import {
  DomainException,
  NotFoundDomainException,
  ForbiddenDomainException,
} from 'src/common/exceptions';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { toSlug, withUniqueSuffix } from 'src/utils/slug.util';
import { BlogTag, BlogTagDocument } from './schema/blog-tag.schema';
import { CreateBlogTagDto } from './dto/create-blog-tag.dto';
import { UpdateBlogTagDto } from './dto/update-blog-tag.dto';
import { BlogTagQueryDto } from './dto/blog-tag-query.dto';

@Injectable()
export class BlogTagService {
  constructor(
    @InjectModel(BlogTag.name)
    private readonly blogTagModel: Model<BlogTagDocument>,
  ) {}

  private pickNameSource(dto: { name: Record<string, string> }): string {
    const n = dto.name;
    return (
      n.vi ||
      n.en ||
      Object.values(n).find((s) => typeof s === 'string' && s.trim()) ||
      'tag'
    );
  }

  async create(dto: CreateBlogTagDto) {
    if (!dto.name || !Object.keys(dto.name).length) {
      throw new DomainException(
        'name must include at least one language',
        400,
        'BAD_REQUEST',
        'blog.tag.bad_request',
      );
    }
    const baseSlug = dto.slug?.trim()
      ? toSlug(dto.slug)
      : toSlug(this.pickNameSource(dto));
    const slug = await withUniqueSuffix(baseSlug, async (s) => {
      const exists = await this.blogTagModel.findOne({
        slug: s,
        isDeleted: { $ne: true },
      });
      return Boolean(exists);
    });

    return this.blogTagModel.create({
      name: dto.name,
      slug,
      isActive: dto.isActive ?? true,
      postCount: 0,
    });
  }

  async findAllPublic(query: BlogTagQueryDto) {
    return this.findAll({ ...query, isActive: true }, { admin: false });
  }

  async findAll(query: BlogTagQueryDto, options?: { admin?: boolean }) {
    const { page = 1, limit = 100, search, isActive, includeDeleted } = query;
    const filter: Record<string, unknown> = {};

    if (!options?.admin || !includeDeleted) {
      filter.isDeleted = { $ne: true };
    }
    if (typeof isActive === 'boolean') {
      filter.isActive = isActive;
    }
    if (search?.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { 'name.vi': regex },
        { 'name.en': regex },
        { slug: regex },
      ];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.blogTagModel
        .find(filter)
        .sort({ slug: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.blogTagModel.countDocuments(filter),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async findBySlug(slug: string) {
    const doc = await this.blogTagModel
      .findOne({ slug, isDeleted: { $ne: true } })
      .lean();
    if (!doc)
      throw new NotFoundDomainException(
        'Blog tag not found',
        'NOT_FOUND',
        'blog.tag.not_found',
      );
    return doc;
  }

  async findById(id: string) {
    const doc = await this.blogTagModel.findById(id).lean();
    if (!doc || doc.isDeleted) {
      throw new NotFoundDomainException(
        'Blog tag not found',
        'NOT_FOUND',
        'blog.tag.not_found',
      );
    }
    return doc;
  }

  async findByIds(ids: string[]) {
    if (!ids?.length) return [];
    return this.blogTagModel
      .find({
        _id: { $in: ids },
        isDeleted: { $ne: true },
      })
      .lean();
  }

  async update(id: string, dto: UpdateBlogTagDto) {
    const doc = await this.blogTagModel.findById(id);
    if (!doc || doc.isDeleted) {
      throw new NotFoundDomainException(
        'Blog tag not found',
        'NOT_FOUND',
        'blog.tag.not_found',
      );
    }
    if (dto.name !== undefined) doc.name = dto.name;
    if (typeof dto.isActive === 'boolean') doc.isActive = dto.isActive;

    if (dto.slug !== undefined) {
      const newSlug = toSlug(dto.slug);
      if (newSlug !== doc.slug) {
        const exists = await this.blogTagModel.findOne({
          slug: newSlug,
          isDeleted: { $ne: true },
          _id: { $ne: doc._id },
        });
        if (exists)
          throw new DomainException(
            'Tag slug already exists',
            409,
            'CONFLICT',
            'blog.tag.conflict',
          );
        doc.slug = newSlug;
      }
    }

    return doc.save().then((d) => d.toObject());
  }

  async incPostCountMany(
    tagIds: (string | Types.ObjectId)[] | undefined,
    delta: number,
  ) {
    if (!tagIds?.length || !delta) return;
    const oids = tagIds
      .map((t) => (typeof t === 'string' ? t : String(t)))
      .filter((id) => Types.ObjectId.isValid(id));
    if (!oids.length) return;
    await this.blogTagModel.updateMany(
      { _id: { $in: oids.map((id) => new Types.ObjectId(id)) } },
      { $inc: { postCount: delta } },
    );
  }

  async softDelete(id: string) {
    const doc = await this.blogTagModel.findById(id);
    if (!doc || doc.isDeleted) {
      throw new NotFoundDomainException(
        'Blog tag not found',
        'NOT_FOUND',
        'blog.tag.not_found',
      );
    }
    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.isActive = false;
    await doc.save();
    return { message: 'Blog tag deleted' };
  }
}
