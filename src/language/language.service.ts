import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { Language, LanguageDocument } from './schema/language.schema';

@Injectable()
export class LanguageService {
  constructor(
    @InjectModel(Language.name)
    private readonly languageModel: Model<LanguageDocument>,
  ) {}

  async create(dto: CreateLanguageDto) {
    const code = dto.code.toUpperCase();

    const existed = await this.languageModel.findOne({ code });
    if (existed) {
      throw new ConflictException('Language code already exists');
    }

    return this.languageModel.create({
      ...dto,
      code,
    });
  }

  findAll() {
    return this.languageModel.find().sort({ createdAt: -1 });
  }

  async findOne(code: string) {
    const lang = await this.languageModel.findOne({
      code: code.toUpperCase(),
    });

    if (!lang) throw new NotFoundException('Language not found');
    return lang;
  }

  async update(code: string, dto: UpdateLanguageDto) {
    delete (dto as any).code; // chặn update code

    const updated = await this.languageModel.findOneAndUpdate(
      { code: code.toUpperCase() },
      dto,
      { new: true },
    );

    if (!updated) throw new NotFoundException('Language not found');
    return updated;
  }

  async remove(code: string) {
    const res = await this.languageModel.deleteOne({
      code: code.toUpperCase(),
    });

    if (!res.deletedCount) {
      throw new NotFoundException('Language not found');
    }

    return true;
  }
}
