/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
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
  ResetPasswordPayload,
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
      secret: this.env.get('JWT_SECRET', 'your_jwt_secret'),
      expiresIn,
      issuer: this.env.get('JWT_ISSUER', 'vn-tours'),
      audience: this.env.get('JWT_AUDIENCE', 'vn-tours-clients'),
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
      secret: this.env.get('JWT_REFRESH_SECRET', 'your_jwt_refresh_secret'),
      expiresIn: this.env.get('JWT_REFRESH_TTL', '7d'),
      issuer: this.env.get('JWT_ISSUER', 'vn-tours'),
      audience: this.env.get('JWT_AUDIENCE', 'vn-tours-clients'),
      jwtid: jti,
    };

    const token = this.jwtService.sign(payload, options);
    return { token, jti };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async revokeRefreshTokenFamily(familyId: string) {
    await this.refreshTokenModel.updateMany(
      { familyId },
      { $set: { isRevoked: true, keepUntil: addDays(new Date(), 1) } },
    );
  }

  // =========================
  // Login
  // =========================
  async login(user: AuthUser, meta: { ip?: string; userAgent?: string } = {}) {
    const accessToken = this.signAccessToken(user);
    const { token: refreshToken, jti } = this.signRefreshToken(user);

    await this.saveRefreshToken(user, refreshToken, jti, {
      familyId: jti,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    const permissions =
      user.permissions ??
      (await this.permissionService.resolvePermissions(user.roles || []));
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
    type ResetUser = {
      _id: Types.ObjectId;
      username: string;
      email?: string;
      tokenVersion?: number;
    };

    const user = await this.userModel
      .findOne({
        $or: [
          { username: identifier },
          { email: identifier },
          { phone: identifier },
        ],
      })
      .select('_id username email tokenVersion')
      .lean<ResetUser | null>();
    console.log(
      `RESET_PASSWORD identifier=${identifier} userEmail=${user?.email}`,
    );
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const target = user.email;
    if (!target) {
      throw new BadRequestException('User does not have an email');
    }

    const payload: ResetPasswordPayload = {
      sub: String(user._id),
      typ: 'reset-password' as const,
      tokenVersion: user.tokenVersion ?? 0,
    };

    const token = this.jwtService.sign(payload, {
      secret: this.env.get('JWT_SECRET', 'your_jwt_secret'),
      expiresIn: '15m',
      issuer: this.env.get('JWT_ISSUER', 'vn-tours'),
      audience: this.env.get('JWT_AUDIENCE', 'vn-tours-clients'),
      jwtid: uuidv4(),
    });

    const feBaseUrl = this.env.get('FE_BASE_URL', 'http://localhost:5173');
    const confirmUrl = `${feBaseUrl}/forgot-password/confirm?token=${encodeURIComponent(token)}`;

    const template = resetPasswordTemplate({
      username: user.username,
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

    let payload: ResetPasswordPayload | null = null;
    try {
      payload = this.jwtService.verify<ResetPasswordPayload>(token, {
        secret: this.env.get('JWT_SECRET', 'your_jwt_secret'),
        issuer: this.env.get('JWT_ISSUER', 'vn-tours'),
        audience: this.env.get('JWT_AUDIENCE', 'vn-tours-clients'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    if (
      !payload?.sub ||
      payload.typ !== 'reset-password' ||
      typeof payload.tokenVersion !== 'number'
    ) {
      throw new UnauthorizedException('Invalid reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updated = await this.userModel
      .findOneAndUpdate(
        { _id: payload.sub, tokenVersion: payload.tokenVersion },
        { $set: { password: hashedPassword }, $inc: { tokenVersion: 1 } },
        { new: true },
      )
      .select('_id username roles')
      .lean<AuthUser | null>();

    if (!updated) {
      throw new UnauthorizedException('Invalid or already used reset token');
    }

    await this.logoutAll(payload.sub);
    return { message: 'Password has been reset successfully' };
  }

  // =========================
  // Register
  // =========================
  async register(
    dto: RegisterDto,
    meta: { ip?: string; userAgent?: string } = {},
  ) {
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

    await this.saveRefreshToken(user, refreshToken, jti, {
      familyId: jti,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      account: user,
    };
  }

  // =========================
  // Refresh token (rotation)
  // =========================
  async refresh(
    oldRefreshToken: string,
    meta: { ip?: string; userAgent?: string } = {},
  ) {
    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(
        oldRefreshToken,
        {
          secret: this.env.get('JWT_REFRESH_SECRET', 'your_jwt_refresh_secret'),
          issuer: this.env.get('JWT_ISSUER', 'vn-tours'),
          audience: this.env.get('JWT_AUDIENCE', 'vn-tours-clients'),
        },
      );

      if (payload.typ !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const existing = await this.refreshTokenModel.findOne({
        jti: payload.jti,
        userId: new Types.ObjectId(payload.sub),
      });

      if (!existing) {
        throw new UnauthorizedException('Refresh token not found');
      }

      if (existing.isRevoked) {
        const familyId = existing.familyId || existing.jti;
        if (!existing.familyId) {
          (existing as any).familyId = familyId;
          await (existing as any).save();
        }
        await this.revokeRefreshTokenFamily(familyId);
        await this.logoutAll(payload.sub);
        throw new UnauthorizedException('Token reuse detected');
      }

      const currentHash = this.hashToken(oldRefreshToken);
      if (existing.tokenHash && existing.tokenHash !== currentHash) {
        const familyId = existing.familyId || existing.jti;
        if (!existing.familyId) {
          (existing as any).familyId = familyId;
          await (existing as any).save();
        }
        await this.revokeRefreshTokenFamily(familyId);
        await this.logoutAll(payload.sub);
        throw new UnauthorizedException('Token reuse detected');
      }
      if (!existing.tokenHash) {
        (existing as any).tokenHash = currentHash;
      }
      if (!existing.familyId) {
        (existing as any).familyId = existing.jti;
      }
      await (existing as any).save();

      if (existing.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token expired');
      }

      // revoke old token
      existing.isRevoked = true;
      (existing as any).keepUntil = addDays(new Date(), 1);
      await existing.save();

      const user = await this.usersService.findOneById(payload.sub);
      if (!user) throw new UnauthorizedException();

      const { token: newRefreshToken, jti } = this.signRefreshToken(user);

      await this.saveRefreshToken(user, newRefreshToken, jti, {
        familyId: (existing as any).familyId,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

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
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
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
      secret: this.env.get('JWT_REFRESH_SECRET', 'your_jwt_refresh_secret'),
      issuer: this.env.get('JWT_ISSUER', 'vn-tours'),
      audience: this.env.get('JWT_AUDIENCE', 'vn-tours-clients'),
    });

    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const existing = await this.refreshTokenModel.findOne({
      jti: payload.jti,
      userId: new Types.ObjectId(payload.sub),
    });
    if (!existing || existing.isRevoked) {
      throw new UnauthorizedException('Session already logged out');
    }

    const currentHash = this.hashToken(refreshToken);
    if (existing.tokenHash && existing.tokenHash !== currentHash) {
      const familyId = existing.familyId || existing.jti;
      if (!existing.familyId) {
        (existing as any).familyId = familyId;
        await (existing as any).save();
      }
      await this.revokeRefreshTokenFamily(familyId);
      await this.logoutAll(payload.sub);
      throw new UnauthorizedException('Token reuse detected');
    }

    if (!existing.tokenHash) {
      (existing as any).tokenHash = currentHash;
    }
    if (!existing.familyId) {
      (existing as any).familyId = existing.jti;
    }

    (existing as any).isRevoked = true;
    (existing as any).keepUntil = addDays(new Date(), 1);
    await (existing as any).save();

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
    options: { familyId?: string; ip?: string; userAgent?: string } = {},
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
      familyId: options.familyId,
      tokenHash: this.hashToken(token),
      isRevoked: false,
      expiresAt,
      keepUntil: addDays(expiresAt, 1),
      ip: options.ip,
      userAgent: options.userAgent,
    });
  }
}
