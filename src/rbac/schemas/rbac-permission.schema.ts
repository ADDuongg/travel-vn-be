import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RbacPermissionDocument = RbacPermission & Document;

/** Fine-grained keys: `{resource}.{action}` — seeded from RBAC_PLANS §3 (+ extensions). */
@Schema({ timestamps: false, collection: 'permissions' })
export class RbacPermission {
  @Prop({ required: true, trim: true, index: true })
  resource: string;

  @Prop({ required: true, trim: true })
  action: string;

  /**
   * Denormalised key for lookups and JWT — must match `${resource}.${action}`.
   */
  @Prop({ required: true, unique: true, trim: true, index: true })
  key: string;

  @Prop({ trim: true })
  description?: string;
}

export const RbacPermissionSchema =
  SchemaFactory.createForClass(RbacPermission);

RbacPermissionSchema.index({ resource: 1, action: 1 }, { unique: true });
