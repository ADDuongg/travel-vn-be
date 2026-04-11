import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './schemas/role.schema';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name)
    private readonly roleModel: Model<Role>,
  ) {}

  // CREATE
  async create(createRoleDto: CreateRoleDto) {
    const existed = await this.roleModel.findOne({
      code: createRoleDto.code,
    });

    if (existed) {
      throw new BadRequestException('Role code already exists');
    }

    const role = new this.roleModel(createRoleDto);
    return role.save();
  }

  // READ ALL
  async findAll() {
    return this.roleModel.find().sort({ createdAt: -1 }).lean();
  }

  // READ ONE (by id)
  async findOne(id: string) {
    const role = await this.roleModel.findById(id).lean();

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  // UPDATE
  async update(id: string, updateRoleDto: UpdateRoleDto) {
    const role = await this.roleModel.findByIdAndUpdate(id, updateRoleDto, {
      new: true,
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  // DELETE
  async remove(id: string) {
    const role = await this.roleModel.findByIdAndDelete(id);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return { deleted: true };
  }
}
