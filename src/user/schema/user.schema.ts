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

  @Prop({ default: false })
  isSuperAdmin: boolean;

  @Prop({ default: 0 })
  tokenVersion: number;

  @Prop({ unique: true, sparse: true })
  email?: string;

  @Prop({ type: Boolean })
  isEmailVerified?: boolean;

  @Prop({ type: Date })
  emailVerifiedAt?: Date;

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

  @Prop({ type: Date })
  deletedAt?: Date;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
  })
  deletedBy?: Types.ObjectId;

  readonly _id: string | Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ deletedAt: 1 }, { sparse: true });
UserSchema.index({ deletedBy: 1 }, { sparse: true });
UserSchema.index({ isEmailVerified: 1, createdAt: 1 });
UserSchema.index({ emailVerifiedAt: 1 }, { sparse: true });
