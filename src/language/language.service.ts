import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { Language, LanguageDocument } from './schema/language.schema';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

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
      throw new ConflictException('Language code already exists');
    }

    let flag;

    if (file) {
      const uploaded = await this.cloudinaryService.uploadFile(file);

      flag = {
        flagUrl: uploaded.secure_url,
        flagPublicId: uploaded.public_id,
      };
    }

    return this.languageModel.create({
      ...dto,
      code,
      ...flag,
    });
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
      throw new NotFoundException('Language not found');
    }

    if (file) {
      if (lang.flagPublicId) {
        await this.cloudinaryService.deleteFile(lang.flagPublicId);
      }

      const uploaded = await this.cloudinaryService.uploadFile(file);

      lang.flagUrl = uploaded.secure_url;
      lang.flagPublicId = uploaded.public_id;
    }

    Object.assign(lang, dto);
    return lang.save();
  }

  async remove(code: string) {
    const lang = await this.languageModel.findOne({
      code: code.toUpperCase(),
    });

    if (!lang) {
      throw new NotFoundException('Language not found');
    }

    if (lang.flagPublicId) {
      await this.cloudinaryService.deleteFile(lang.flagPublicId);
    }

    await lang.deleteOne();
    return true;
  }
}
