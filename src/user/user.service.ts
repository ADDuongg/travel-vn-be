import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { User, UserDocument } from './schema/user.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    // @InjectConnection() private connection: Connection,
  ) {}
  async create(userDto: CreateUserDto): Promise<any> {
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

  findAll() {
    return this.userModel.find().exec();
  }

  findOneById(id: number) {
    return this.userModel.findById(id).exec();
  }

  async findOne(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).lean();
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return this.userModel.findByIdAndUpdate(id, updateUserDto, { new: true });
  }

  remove(id: string) {
    return this.userModel.findByIdAndDelete(id).exec();
  }
}
