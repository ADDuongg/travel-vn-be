/* eslint-disable @typescript-eslint/require-await */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { EnvService } from 'src/env/env.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private env: EnvService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.get('JWT_SECRET', 'your_jwt_secret'), // Lấy secret từ env
    });
  }

  async validate(payload: Record<string, unknown>) {
    const rbac = Array.isArray(payload.rbacPermissions)
      ? (payload.rbacPermissions as string[])
      : [];

    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
      roles: (payload.roles as string[]) || [],
      rbacPermissions: rbac,
      isSuperAdmin: payload.isSuperAdmin === true,
    };
  }
}
