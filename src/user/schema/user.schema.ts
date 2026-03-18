// users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ collection: 'user', timestamps: true })
export class User {
  @Prop({ required: true, unique: true, index: true })
  username: string;

  @Prop()
  password: string;

  @Prop({
    type: [String],
    default: [],
    index: true,
  })
  roles: string[];

  @Prop({ default: 0 })
  tokenVersion: number;

  @Prop({ unique: true, sparse: true })
  email?: string;

  @Prop()
  fullName?: string;

  @Prop({ sparse: true })
  phone?: string;

  @Prop({
    type: {
      url: String,
      publicId: String,
    },
  })
  avatar?: {
    url: string;
    publicId?: string;
  };

  @Prop()
  dateOfBirth?: Date;

  @Prop({ enum: ['male', 'female', 'other'] })
  gender?: string;

  /** Địa chỉ: reference collection provinces (tỉnh → quận/huyện → phường/xã) */
  @Prop({
    type: {
      provinceId: { type: MongooseSchema.Types.ObjectId, ref: 'Province' },
      districtCode: String,
      wardCode: String,
      detail: String,
    },
  })
  address?: {
    provinceId?: Types.ObjectId;
    districtCode?: string;
    wardCode?: string;
    detail?: string;
  };

  @Prop({ default: true })
  isActive: boolean;

  readonly _id: string | Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);
