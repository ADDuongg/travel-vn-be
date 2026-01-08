import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
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
    // @InjectConnection() private connection: Connection,
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

  remove(id: string) {
    return this.userModel.findByIdAndDelete(id).exec();
  }
}
