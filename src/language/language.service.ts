import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { Language, LanguageDocument } from './schema/language.schema';
import { UploadApiResponse } from 'cloudinary';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { CloudinaryResponse } from 'src/cloudinary/cloudinary.response';
import {
  DomainException,
  NotFoundDomainException,
} from 'src/common/exceptions';
import { withI18nSuccess } from 'src/common/i18n/success-envelope';
import { hasMulterFileContent } from 'src/utils/multer.util';
import { LanguageI18nKeys } from './language.i18n-keys';

@Injectable()
export class LanguageService {
  constructor(
    @InjectModel(Language.name)
    private readonly languageModel: Model<LanguageDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(dto: CreateLanguageDto, file?: Express.Multer.File) {
    const code = dto.code.toUpperCase();

    const existed = await this.findByCode(code);
    if (existed) {
      throw new DomainException(
        'Language code already exists',
        409,
        'LANGUAGE_CODE_EXISTS',
        LanguageI18nKeys.codeExists,
      );
    }

    let flag;

    if (hasMulterFileContent(file)) {
      flag = await this.uploadFlag(file);
    }

    const created = await this.languageModel.create({
      ...dto,
      code,
      ...flag,
    });
    return withI18nSuccess(
      created,
      'Language created successfully',
      LanguageI18nKeys.created,
    );
  }

  findAll() {
    return this.languageModel.find().sort({ createdAt: -1 });
  }

  async update(
    code: string,
    dto: UpdateLanguageDto,
    file?: Express.Multer.File,
  ) {
    const lang = await this.findByCode(code);
    if (!lang) {
      throw new NotFoundDomainException(
        'Language not found',
        'LANGUAGE_NOT_FOUND',
        LanguageI18nKeys.notFound,
      );
    }

    if (hasMulterFileContent(file)) {
      if (lang.flagPublicId && this.cloudinaryService.isConfigured()) {
        await this.cloudinaryService
          .deleteFile(lang.flagPublicId)
          .catch(() => undefined);
      }

      const flag = await this.uploadFlag(file);
      lang.flagUrl = flag.flagUrl;
      lang.flagPublicId = flag.flagPublicId;
    }

    this.applyUpdateDto(lang, dto);
    const saved = await lang.save();
    return withI18nSuccess(
      saved,
      'Language updated successfully',
      LanguageI18nKeys.updated,
    );
  }

  async remove(code: string) {
    const lang = await this.findByCode(code);
    if (!lang) {
      throw new NotFoundDomainException(
        'Language not found',
        'LANGUAGE_NOT_FOUND',
        LanguageI18nKeys.notFound,
      );
    }

    if (lang.flagPublicId && this.cloudinaryService.isConfigured()) {
      await this.cloudinaryService
        .deleteFile(lang.flagPublicId)
        .catch(() => undefined);
    }

    await lang.deleteOne();
    return withI18nSuccess(
      true,
      'Language deleted successfully',
      LanguageI18nKeys.deleted,
    );
  }

  /**
   * Case-insensitive lookup. Schema `uppercase: true` casts plain `{ code: 'en' }`
   * queries to `EN`, which misses legacy lowercase documents in MongoDB.
   */
  private findByCode(code: string): Promise<LanguageDocument | null> {
    const trimmed = code.trim();
    if (!trimmed) {
      return Promise.resolve(null);
    }
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.languageModel
      .findOne({
        code: { $regex: `^${escaped}$`, $options: 'i' },
      })
      .exec();
  }

  /** Chỉ gán field text/boolean — không ghi đè flag từ multipart (flagUrl rỗng từ FE). */
  private applyUpdateDto(lang: LanguageDocument, dto: UpdateLanguageDto) {
    if (dto.name !== undefined) {
      lang.name = dto.name;
    }
    if (typeof dto.isActive === 'boolean') {
      lang.isActive = dto.isActive;
    }
  }

  private toFlagFields(result: CloudinaryResponse): {
    flagUrl: string;
    flagPublicId: string;
  } {
    if (
      result &&
      typeof result === 'object' &&
      'error' in result &&
      result.error
    ) {
      const err = (result as { error?: { message?: string } }).error;
      throw new DomainException(
        err?.message ?? 'Cloudinary upload error',
        400,
        'LANGUAGE_FLAG_UPLOAD_FAILED',
        LanguageI18nKeys.flagUploadFailed,
      );
    }

    const uploaded = result as UploadApiResponse;
    const flagUrl = uploaded.secure_url ?? uploaded.url;
    const flagPublicId = uploaded.public_id;

    if (!flagUrl || !flagPublicId) {
      throw new DomainException(
        'Invalid upload result',
        400,
        'LANGUAGE_FLAG_UPLOAD_FAILED',
        LanguageI18nKeys.flagUploadFailed,
      );
    }

    return { flagUrl, flagPublicId };
  }

  private async uploadFlag(
    file: Express.Multer.File,
  ): Promise<{ flagUrl: string; flagPublicId: string }> {
    if (!this.cloudinaryService.isConfigured()) {
      throw new DomainException(
        'Image upload is not configured on the server',
        503,
        'CLOUDINARY_NOT_CONFIGURED',
        LanguageI18nKeys.uploadUnavailable,
      );
    }

    try {
      const result = await this.cloudinaryService.uploadFile(file, {
        folder: 'languages/flags',
      });
      return this.toFlagFields(result);
    } catch (err) {
      if (err instanceof DomainException) {
        throw err;
      }
      const message = err instanceof Error ? err.message : 'Flag upload failed';
      throw new DomainException(
        message,
        400,
        'LANGUAGE_FLAG_UPLOAD_FAILED',
        LanguageI18nKeys.flagUploadFailed,
      );
    }
  }
}
