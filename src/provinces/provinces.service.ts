import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Province, ProvinceDocument } from './schema/province.schema';

@Injectable()
export class ProvincesService {
  constructor(
    @InjectModel(Province.name)
    private readonly provinceModel: Model<ProvinceDocument>,
  ) {}

  findAll() {
    return this.provinceModel
      .find({ type: 'province' })
      .select('_id code slug name fullName')
      .sort({ 'name.vi': 1 })
      .lean();
  }
}
