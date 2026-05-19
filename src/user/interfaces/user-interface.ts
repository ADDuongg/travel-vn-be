import { Types } from 'mongoose';

export interface AuthUser {
  _id: string | Types.ObjectId;
  username: string;
  roles: string[];
  permissions: {
    routers: string[];
    apis: string[];
  };

  rbacPermissions?: string[];
  isSuperAdmin?: boolean;

  isEmailVerified?: boolean;
}

export interface UserWithPassword {
  _id: string | Types.ObjectId;
  username: string;
  password: string;
  roles: string[];
  permissions: {
    routers: string[];
    apis: string[];
  };
  rbacPermissions?: string[];
  isSuperAdmin?: boolean;
  isActive?: boolean;
  deletedAt?: Date | null;
  isEmailVerified?: boolean;
}
