import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { PermissionModule } from 'src/permission/permission.module';

import { UserAdminController } from './user.admin.controller';
import { UserClientController } from './user.client.controller';
import { UserService } from './user.service';
import { User, UserSchema } from './schema/user.schema';

@Module({
  controllers: [UserClientController, UserAdminController],
  providers: [UserService],
  exports: [UserService],
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    PermissionModule,
    CloudinaryModule,
  ],
})
export class UserModule {}
