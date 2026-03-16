import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { addDays } from 'date-fns';

import { UserService } from 'src/user/user.service';
import { RegisterDto } from './dto/register.dto';
import { RefreshToken } from './schema/refresh_token.schema';
import { EnvService } from 'src/env/env.service';
import { OtpService } from 'src/otp/otp.service';
import { MailService } from 'src/mail/mail.service';
import { resetPasswordTemplate } from 'src/notification/email/templates/auth-notification.templates';

import {
  AccessTokenPayload,
  JwtDecoded,
  RefreshTokenPayload,
} from './interfaces/jwt-payload.interface';
import { AuthUser } from 'src/user/interfaces/user-interface';
import { PermissionService } from '../permission/permission.service';
import { User, UserDocument } from 'src/user/schema/user.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshToken>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly env: EnvService,
    private readonly permissionService: PermissionService,
    private readonly otpService: OtpService,
    private readonly mailService: MailService,
  ) {}

  // =========================
  // Validate user
  // =========================
  async validateUser(username: string, pass: string): Promise<AuthUser | null> {
    const user = await this.usersService.findOne(username);
    if (!user) return null;

    const match = await bcrypt.compare(pass, user.password);
    if (!match) return null;

    const permissions = await this.permissionService.resolvePermissions(
      user.roles || [],
    );

    return {
      _id: user._id,
      username: user.username,
      roles: user.roles,
      permissions,
    };
  }

  // =========================
  // Sign access token
  // =========================
  private signAccessToken(user: AuthUser): string {
    const expiresIn = this.env.isProduction() ? '10m' : '1h';

    const payload: AccessTokenPayload = {
      sub: String(user._id),
      username: user.username,
      roles: user.roles,
      typ: 'access',
    };

    return this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_SECRET')!,
      expiresIn,
      issuer: this.env.get('JWT_ISSUER', 'my-app'),
      audience: this.env.get('JWT_AUDIENCE', 'my-app-clients'),
      jwtid: uuidv4(),
    });
  }

  // =========================
  // Sign refresh token
  // =========================
  private signRefreshToken(user: AuthUser): { token: string; jti: string } {
    const jti = uuidv4();

    const payload: RefreshTokenPayload = {
      sub: String(user._id),
      typ: 'refresh',
    };

    const options: JwtSignOptions = {
      secret: this.config.get<string>('JWT_REFRESH_SECRET')!,
      expiresIn: this.config.get<string>('JWT_REFRESH_TTL') ?? '7d',
      issuer: this.config.get('JWT_ISSUER') ?? 'my-app',
      audience: this.config.get('JWT_AUDIENCE') ?? 'my-app-clients',
      jwtid: jti,
    };

    const token = this.jwtService.sign(payload, options);
    return { token, jti };
  }

  // =========================
  // Login
  // =========================
  async login(user: AuthUser) {
    const accessToken = this.signAccessToken(user);
    const { token: refreshToken, jti } = this.signRefreshToken(user);

    await this.saveRefreshToken(user, refreshToken, jti);
    const permissions = await this.permissionService.resolvePermissions(
      user.roles || [],
    );
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      account: {
        _id: user._id,
        username: user.username,
        roles: user.roles,
        permissions,
      },
    };
  }

  // =========================
  // Quên mật khẩu với token
  // =========================
  async requestPasswordReset(identifier: string) {
    const user = await this.userModel
      .findOne({
        $or: [
          { username: identifier },
          { email: identifier },
          { phone: identifier },
        ],
      })
      .select('_id username email')
      .lean();
    console.log(
      `RESET_PASSWORD identifier=${identifier} userEmail=${user?.email}`,
    );
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const target = (user as any).email;
    if (!target) {
      throw new BadRequestException('User does not have an email');
    }

    const payload = {
      sub: String(user._id),
      typ: 'reset-password' as const,
    };

    const token = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_SECRET')!,
      expiresIn: '15m',
      issuer: this.env.get('JWT_ISSUER', 'my-app'),
      audience: this.env.get('JWT_AUDIENCE', 'my-app-clients'),
      jwtid: uuidv4(),
    });

    const feBaseUrl = this.env.get('FE_BASE_URL', 'http://localhost:5173');
    const confirmUrl = `${feBaseUrl}/forgot-password/confirm?token=${encodeURIComponent(token)}`;

    const template = resetPasswordTemplate({
      username: (user as any).username,
      confirmUrl,
    });

    await this.mailService.send({
      to: target,
      subject: template.subject,
      html: template.html,
    });

    return { message: 'Password reset email sent' };
  }

  async resetPasswordWithToken(token: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('New password is too short');
    }

    let payload: { sub: string; typ?: string } | null = null;
    try {
      payload = this.jwtService.verify<{ sub: string; typ?: string }>(token, {
        secret: this.config.get<string>('JWT_SECRET')!,
        issuer: this.env.get('JWT_ISSUER', 'my-app'),
        audience: this.env.get('JWT_AUDIENCE', 'my-app-clients'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    if (!payload?.sub || payload.typ !== 'reset-password') {
      throw new UnauthorizedException('Invalid reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updated = await this.userModel
      .findByIdAndUpdate(
        payload.sub,
        { $set: { password: hashedPassword } },
        { new: true },
      )
      .select('_id username roles')
      .lean<AuthUser | null>();

    if (!updated) {
      throw new UnauthorizedException('User not found');
    }

    return { message: 'Password has been reset successfully' };
  }

  // =========================
  // Register
  // =========================
  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Password confirmation does not match');
    }

    const existing = await this.usersService.findOne(dto.username);
    if (existing) {
      throw new ConflictException('Username already exists');
    }

    const addressInput = (dto as any).address;
    const normalizedAddress =
      addressInput && typeof addressInput === 'string'
        ? { detail: addressInput }
        : addressInput;

    const created = await this.usersService.create({
      username: dto.username,
      password: dto.password,
      roles: ['user'],
      email: dto.email,
      fullName: dto.fullName,
      phone: dto.phone,
      dateOfBirth: dto.dateOfBirth,
      address: normalizedAddress,
      permissions: {
        apis: [],
        routers: [],
      },
    });

    const user: AuthUser = {
      _id: created._id,
      username: created.username,
      roles: created.roles,
      permissions: {
        apis: [],
        routers: [],
      },
    };

    const accessToken = this.signAccessToken(user);
    const { token: refreshToken, jti } = this.signRefreshToken(user);

    await this.saveRefreshToken(user, refreshToken, jti);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      account: user,
    };
  }

  // =========================
  // Refresh token (rotation)
  // =========================
  async refresh(oldRefreshToken: string) {
    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(
        oldRefreshToken,
        {
          secret: this.config.get<string>('JWT_REFRESH_SECRET')!,
          issuer: this.config.get('JWT_ISSUER') ?? 'my-app',
          audience: this.config.get('JWT_AUDIENCE') ?? 'my-app-clients',
        },
      );

      if (payload.typ !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const existing = await this.refreshTokenModel.findOne({
        jti: payload.jti,
        userId: new Types.ObjectId(payload.sub),
        isRevoked: false,
      });

      if (!existing) {
        throw new UnauthorizedException('Refresh token not found');
      }

      if (existing.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token expired');
      }

      // revoke old token
      existing.isRevoked = true;
      await existing.save();

      const user = await this.usersService.findOneById(payload.sub);
      if (!user) throw new UnauthorizedException();

      const { token: newRefreshToken, jti } = this.signRefreshToken(user);

      await this.saveRefreshToken(user, newRefreshToken, jti);

      const newAccessToken = this.signAccessToken(user);
      const permissions = await this.permissionService.resolvePermissions(
        user.roles || [],
      );
      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        account: {
          _id: user._id,
          username: user.username,
          roles: user.roles,
          permissions,
        },
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async me(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password')
      .lean();

    if (!user) {
      throw new UnauthorizedException();
    }
    const permissions = await this.permissionService.resolvePermissions(
      user.roles || [],
    );
    return {
      ...user,
      id: String(user._id),
      permissions,
    };
  }

  async logout(refreshToken: string) {
    const payload = this.jwtService.verify<RefreshTokenPayload>(refreshToken, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET')!,
      issuer: this.config.get('JWT_ISSUER') ?? 'my-app',
      audience: this.config.get('JWT_AUDIENCE') ?? 'my-app-clients',
    });

    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const result = await this.refreshTokenModel.updateOne(
      {
        jti: payload.jti,
        userId: new Types.ObjectId(payload.sub),
        isRevoked: false,
      },
      {
        $set: {
          isRevoked: true,
          keepUntil: addDays(new Date(), 1),
        },
      },
    );

    if (result.modifiedCount === 0) {
      throw new UnauthorizedException('Session already logged out');
    }

    return { message: 'Logged out successfully' };
  }

  // =========================
  // Logout all sessions
  // =========================
  async logoutAll(userId: string) {
    const result = await this.refreshTokenModel.updateMany(
      {
        userId: new Types.ObjectId(userId),
        isRevoked: false,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          isRevoked: true,
          keepUntil: addDays(new Date(), 1),
        },
      },
    );

    return {
      message: 'All sessions logged out successfully',
      modified: result.modifiedCount,
    };
  }

  // =========================
  // Save refresh token
  // =========================
  private async saveRefreshToken(
    user: AuthUser,
    token: string,
    jti: string,
  ): Promise<void> {
    function isJwtDecoded(payload: unknown): payload is JwtDecoded {
      return (
        typeof payload === 'object' &&
        payload !== null &&
        'exp' in payload &&
        typeof (payload as Record<string, unknown>).exp === 'number'
      );
    }

    const decoded: unknown = this.jwtService.decode(token);

    if (!isJwtDecoded(decoded)) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const expiresAt = new Date(decoded.exp * 1000);

    await this.refreshTokenModel.create({
      jti,
      userId: user._id,
      familyId: jti,
      isRevoked: false,
      expiresAt,
      keepUntil: addDays(expiresAt, 1),
    });
  }
}
