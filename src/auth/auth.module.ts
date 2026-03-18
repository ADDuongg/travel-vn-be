import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';

import { ApiRole, ApiRoleSchema } from 'src/api-role/schema/api-role.schema';
import { EnvModule } from 'src/env/env.module';
import { MailModule } from 'src/mail/mail.module';
import { OtpModule } from 'src/otp/otp.module';
import {
  RouterRole,
  RouterRoleSchema,
} from 'src/router-role/schema/router-role.schema';
import { UserModule } from 'src/user/user.module';
import { User, UserSchema } from 'src/user/schema/user.schema';
import { JwtStrategy } from 'src/jwt/jwt.strategy';
import { PermissionService } from 'src/permission/permission.service';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  RefreshToken,
  RefreshTokenSchema,
} from './schema/refresh_token.schema';

@Module({
  imports: [
    PassportModule,
    UserModule,
    OtpModule,
    EnvModule,
    MailModule,
    MongooseModule.forFeature([
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: RouterRole.name, schema: RouterRoleSchema },
      { name: ApiRole.name, schema: ApiRoleSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PermissionService],
  exports: [AuthService, PermissionService],
})
export class AuthModule {}
