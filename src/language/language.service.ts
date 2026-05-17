import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { Language, LanguageDocument } from './schema/language.schema';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { DomainException, NotFoundDomainException } from 'src/common/exceptions';
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

    const existed = await this.languageModel.findOne({ code });
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
      const uploaded = await this.cloudinaryService.uploadFile(file);

      flag = {
        flagUrl: uploaded.secure_url,
        flagPublicId: uploaded.public_id,
      };
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
    delete (dto as any).code;

    const lang = await this.languageModel.findOne({
      code: code.toUpperCase(),
    });

    if (!lang) {
      throw new NotFoundDomainException(
        'Language not found',
        'LANGUAGE_NOT_FOUND',
        LanguageI18nKeys.notFound,
      );
    }

    if (hasMulterFileContent(file)) {
      if (lang.flagPublicId) {
        await this.cloudinaryService.deleteFile(lang.flagPublicId);
      }

      const uploaded = await this.cloudinaryService.uploadFile(file);

      lang.flagUrl = uploaded.secure_url;
      lang.flagPublicId = uploaded.public_id;
    }

    Object.assign(lang, dto);
    const saved = await lang.save();
    return withI18nSuccess(
      saved,
      'Language updated successfully',
      LanguageI18nKeys.updated,
    );
  }

  async remove(code: string) {
    const lang = await this.languageModel.findOne({
      code: code.toUpperCase(),
    });

    if (!lang) {
      throw new NotFoundDomainException(
        'Language not found',
        'LANGUAGE_NOT_FOUND',
        LanguageI18nKeys.notFound,
      );
    }

    if (lang.flagPublicId) {
      await this.cloudinaryService.deleteFile(lang.flagPublicId);
    }

    await lang.deleteOne();
    return withI18nSuccess(
      true,
      'Language deleted successfully',
      LanguageI18nKeys.deleted,
    );
  }
}
