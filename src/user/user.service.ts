import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model, Types } from 'mongoose';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { PermissionService } from 'src/permission/permission.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthUser, UserWithPassword } from './interfaces/user-interface';
import { User, UserDocument } from './schema/user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly permissionService: PermissionService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}
  async create(userDto: CreateUserDto): Promise<User> {
    const existedUser = await this.userModel.findOne({
      $or: [{ username: userDto.username }, { email: userDto.email }],
    });
    if (existedUser) {
      throw new BadRequestException('Username hoặc email đã tồn tại');
    }

    const { password, ...rest } = userDto;
    const hashedPassword = await bcrypt.hash(password, 10);

    const createdUser = new this.userModel({
      ...rest,
      password: hashedPassword,
    });
    const savedUser = await createdUser.save();
    return savedUser;
  }
  async findForAuth(username: string) {
    return this.userModel.findOne({ username }).select('+password').lean();
  }

  findAll() {
    return this.userModel.find().exec();
  }

  async findOneById(id: string): Promise<AuthUser | null> {
    const user = await this.userModel
      .findById(id)
      .select('_id username roles')
      .lean<AuthUser>()
      .exec();
    if (!user) return null;

    const permissions = await this.permissionService.resolvePermissions(
      user.roles || [],
    );

    return {
      ...user,
      permissions,
    };
  }

  async findOne(username: string): Promise<UserWithPassword | null> {
    const user = await this.userModel.findOne({ username });
    if (!user) return null;

    const permissions = await this.permissionService.resolvePermissions(
      user.roles || [],
    );

    return {
      ...user.toObject(),
      permissions,
    };
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return this.userModel.findByIdAndUpdate(id, updateUserDto, { new: true });
  }

  async updateProfile(
    userId: string,
    updateUserDto: UpdateUserDto,
    file?: Express.Multer.File,
  ) {
    const dto = { ...updateUserDto };
    console.log('dto', dto);
    console.log('file', file);

    if (file) {
      const current = await this.userModel
        .findById(userId)
        .select('avatar')
        .lean();
      if (current?.avatar?.publicId) {
        await this.cloudinaryService
          .deleteFile(current.avatar.publicId)
          .catch(() => {});
      }
      const result = await this.cloudinaryService.uploadFile(file, {
        folder: 'users/avatars',
      });
      dto.avatar = { url: result.secure_url, publicId: result.public_id };
    }

    const orConditions: Array<Record<string, unknown>> = [];
    if (dto.username !== undefined)
      orConditions.push({ username: dto.username });
    if (dto.email !== undefined) orConditions.push({ email: dto.email });
    if (orConditions.length > 0) {
      const existed = await this.userModel.findOne({
        _id: { $ne: userId },
        $or: orConditions,
      });
      if (existed) {
        throw new BadRequestException('Username hoặc email đã tồn tại');
      }
    }

    const $set: Record<string, unknown> = {};
    if (dto.username !== undefined) $set.username = dto.username;
    if (dto.email !== undefined) $set.email = dto.email;
    if (dto.roles !== undefined) $set.roles = dto.roles;
    if (dto.fullName !== undefined) $set.fullName = dto.fullName;
    if (dto.phone !== undefined) $set.phone = dto.phone;
    if (dto.avatar !== undefined) $set.avatar = dto.avatar;
    if (dto.dateOfBirth !== undefined) $set.dateOfBirth = dto.dateOfBirth;
    if (dto.gender !== undefined) $set.gender = dto.gender;
    if (dto.address !== undefined) {
      const addr = { ...dto.address };
      const pid = addr.provinceId;
      if (typeof pid === 'string' && Types.ObjectId.isValid(pid)) {
        (addr as Record<string, unknown>).provinceId = new Types.ObjectId(pid);
      }
      $set.address = addr;
    }

    if (dto.password !== undefined) {
      $set.password = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.userModel
      .findByIdAndUpdate(userId, { $set }, { new: true })
      .select(
        '_id username roles fullName phone avatar email dateOfBirth gender address isActive',
      )
      .lean();

    return updated;
  }

  remove(id: string) {
    return this.userModel.findByIdAndDelete(id).exec();
  }

  /** Thêm role vào user (dùng cho TourGuide register). */
  async addRole(userId: string, role: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) return;
    const roles = user.roles || [];
    if (roles.includes(role)) return;
    await this.userModel
      .findByIdAndUpdate(userId, { $addToSet: { roles: role } })
      .exec();
  }

  /** Bỏ role khỏi user (dùng cho TourGuide soft delete). */
  async removeRole(userId: string, role: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, { $pull: { roles: role } })
      .exec();
  }

  /** Tìm _id của users có fullName khớp search (cho TourGuide search). */
  async findIdsByFullNameSearch(search: string): Promise<Types.ObjectId[]> {
    if (!search?.trim()) return [];
    const users = await this.userModel
      .find({ fullName: new RegExp(search.trim(), 'i') })
      .select('_id')
      .lean();
    return users.map((u) => u._id as Types.ObjectId);
  }
}
