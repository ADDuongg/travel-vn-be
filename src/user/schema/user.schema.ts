// users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

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

  @Prop()
  age?: number;

  @Prop({ unique: true, sparse: true })
  email?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
