import { Types } from 'mongoose';

export interface AuthUser {
  _id: string | Types.ObjectId;
  username: string;
  roles: string[];
  permissions: {
    routers: string[];
    apis: string[];
  };
  /** Flat `resource.action` keys for RBAC (JWT + admin guards). */
  rbacPermissions?: string[];
  isSuperAdmin?: boolean;
  /** false = not verified; undefined = legacy (treated as verified in JWT). */
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
