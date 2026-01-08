// auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JwtStrategy } from 'src/jwt/jwt.strategy';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import {
  RefreshToken,
  RefreshTokenSchema,
} from './schema/refresh_token.schema';
import { EnvService } from 'src/env/env.service';
import { EnvModule } from 'src/env/env.module';
import {
  RouterRole,
  RouterRoleSchema,
} from 'src/router-role/schema/router-role.schema';
import { ApiRole, ApiRoleSchema } from 'src/api-role/schema/api-role.schema';
import { PermissionService } from '../permission/permission.service';
import { User, UserSchema } from 'src/user/schema/user.schema';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [EnvModule],
      inject: [EnvService],
      useFactory: (env: EnvService) => ({
        secret: env.get('JWT_SECRET', 'your_jwt_secret'),
        signOptions: { expiresIn: '60m' },
      }),
    }),
    UserModule,
    EnvModule,
    MongooseModule.forFeature([
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: RouterRole.name, schema: RouterRoleSchema },
      { name: ApiRole.name, schema: ApiRoleSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PermissionService],
  exports: [AuthService, JwtModule, PermissionService],
})
export class AuthModule {}
