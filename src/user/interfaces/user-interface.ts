import { Types } from 'mongoose';

export interface AuthUser {
  _id: string | Types.ObjectId;
  username: string;
  roles: string[];
  permissions: {
    routers: string[];
    apis: string[];
  };
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
}
