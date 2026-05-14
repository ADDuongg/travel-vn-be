import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './schema/user.schema';

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findByIdForAdminAccess(userId: string) {
    return this.userModel
      .findById(userId)
      .select('isActive deletedAt roles isSuperAdmin')
      .lean<{
        isActive?: boolean;
        deletedAt?: Date | null;
        roles?: string[];
        isSuperAdmin?: boolean;
      }>()
      .exec();
  }

  async findOneByUsernameOrEmail(username: string, email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    return this.userModel.findOne({
      $or: [{ username }, { email: normalizedEmail }],
    });
  }

  async create(userDto: CreateUserDto, hashedPassword: string): Promise<User> {
    const { password: _p, ...rest } = userDto;
    const email =
      typeof rest.email === 'string' ? rest.email.trim().toLowerCase() : rest.email;
    const createdUser = new this.userModel({
      ...rest,
      email,
      password: hashedPassword,
    });
    return createdUser.save();
  }

  findForAuth(username: string) {
    return this.userModel.findOne({ username }).select('+password').lean();
  }

  findAll() {
    return this.userModel.find().exec();
  }

  async findOneByIdForAuth(id: string) {
    return this.userModel
      .findById(id)
      .select(
        '_id username roles isSuperAdmin isActive deletedAt isEmailVerified',
      )
      .lean<Omit<
        import('./interfaces/user-interface').AuthUser,
        'permissions'
      > | null>()
      .exec();
  }

  findOneDocumentByUsername(username: string) {
    return this.userModel.findOne({ username });
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return this.userModel.findByIdAndUpdate(id, updateUserDto, { new: true });
  }

  async findByIdSelectAvatar(userId: string) {
    return this.userModel.findById(userId).select('avatar').lean();
  }

  async findDuplicateUsernameOrEmail(
    userId: string,
    orConditions: Array<Record<string, unknown>>,
  ) {
    if (!orConditions.length) return null;
    return this.userModel.findOne({
      _id: { $ne: userId },
      $or: orConditions,
    });
  }

  async updateProfileById(userId: string, $set: Record<string, unknown>) {
    return this.userModel
      .findByIdAndUpdate(userId, { $set }, { new: true })
      .select(
        '_id username roles fullName phone avatar email dateOfBirth gender address isActive',
      )
      .lean();
  }

  remove(id: string) {
    return this.userModel.findByIdAndDelete(id).exec();
  }

  async resetPasswordHashed(id: string, hashedPassword: string) {
    return this.userModel
      .findByIdAndUpdate(
        id,
        { $set: { password: hashedPassword } },
        { new: true },
      )
      .select('_id username email fullName roles isActive')
      .lean()
      .exec();
  }

  async findByIdPlain(userId: string) {
    return this.userModel.findById(userId).exec();
  }

  async addRoleIfMissing(userId: string, role: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) return;
    const roles = user.roles || [];
    if (roles.includes(role)) return;
    await this.userModel
      .findByIdAndUpdate(userId, { $addToSet: { roles: role } })
      .exec();
  }

  async removeRole(userId: string, role: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, { $pull: { roles: role } })
      .exec();
  }

  async findBasicInfo(userId: string) {
    return this.userModel
      .findById(userId)
      .select('_id username fullName email')
      .lean()
      .exec();
  }

  async findIdsByFullNameSearch(search: string): Promise<Types.ObjectId[]> {
    if (!search?.trim()) return [];
    const users = await this.userModel
      .find({ fullName: new RegExp(search.trim(), 'i') })
      .select('_id')
      .lean();
    return users.map((u) => u._id as Types.ObjectId);
  }
}
