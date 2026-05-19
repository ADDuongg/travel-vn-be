import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

import { RbacPermission } from './rbac-permission.schema';
import { Role } from 'src/roles/schemas/role.schema';

export type RbacRolePermissionDocument = RbacRolePermission & Document;

@Schema({ timestamps: false, collection: 'role_permissions' })
export class RbacRolePermission {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Role.name,
    required: true,
    index: true,
  })
  roleId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: RbacPermission.name,
    required: true,
    index: true,
  })
  permissionId: Types.ObjectId;
}

export const RbacRolePermissionSchema =
  SchemaFactory.createForClass(RbacRolePermission);

RbacRolePermissionSchema.index(
  { roleId: 1, permissionId: 1 },
  { unique: true },
);
