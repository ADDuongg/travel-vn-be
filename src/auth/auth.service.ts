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
import { UserService } from 'src/user/user.service';
import { RegisterDto } from './dto/register.dto';
import { InjectModel } from '@nestjs/mongoose';
import { RefreshToken } from './schema/refresh_token.schema';
import { Model, Types } from 'mongoose';
import { addDays } from 'date-fns';
@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
    private config: ConfigService,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshToken>,
  ) {}

  async validateUser(username: string, pass: string) {
    const user = await this.usersService.findOne(username);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const userObj = user.toObject();
      delete userObj.password;
      return userObj;
    }
    console.log('Invalid credentials');

    return null;
  }

  private signAccessToken(user: any) {
    const payload = { sub: String(user._id), role: user.role, typ: 'access' };
    const opts: JwtSignOptions = {
      expiresIn: this.config.get('JWT_ACCESS_TTL') ?? '10m',
      issuer: this.config.get('JWT_ISSUER') ?? 'my-app',
      audience: this.config.get('JWT_AUDIENCE') ?? 'my-app-clients',
      jwtid: uuidv4(),
    };
    return this.jwtService.sign(payload, opts);
  }

  private signRefreshToken(user: any) {
    const jti = uuidv4();
    const payload = { sub: String(user._id), typ: 'refresh' };
    const opts: JwtSignOptions = {
      expiresIn: this.config.get('JWT_REFRESH_TTL') ?? '7d',
      issuer: this.config.get('JWT_ISSUER') ?? 'my-app',
      audience: this.config.get('JWT_AUDIENCE') ?? 'my-app-clients',
      jwtid: jti,
      secret: this.config.get('JWT_REFRESH_SECRET'),
    };
    const token = this.jwtService.sign(payload, opts);
    return { token, jti };
  }

  async login(user: any) {
    const accessToken = this.signAccessToken(user);
    const { token: refreshToken, jti } = this.signRefreshToken(user);

    await this.saveRefreshToken(user, refreshToken, jti);

    const account = { _id: user._id, username: user.username, role: user.role };
    return { access_token: accessToken, refresh_token: refreshToken, account };
  }

  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Password confirmation does not match');
    }

    const existing = await this.usersService.findOne(dto.username);
    if (existing) {
      throw new ConflictException('Username already exists');
    }

    const user = await this.usersService.create({
      username: dto.username,
      password: dto.password,
      role: 'user',
      age: dto.age,
      email: dto.email,
    });

    const accessToken = this.signAccessToken(user);
    const { token: refreshToken, jti } = this.signRefreshToken(user);

    await this.saveRefreshToken(user, refreshToken, jti);

    const account = {
      _id: user._id ?? user.id,
      username: user.username,
      role: user.role,
    };
    return { access_token: accessToken, refresh_token: refreshToken, account };
  }

  async refresh(oldRefreshToken: string) {
    try {
      const payload = this.jwtService.verify(oldRefreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        issuer: this.config.get('JWT_ISSUER') ?? 'my-app',
        audience: this.config.get('JWT_AUDIENCE') ?? 'my-app-clients',
      });

      if (payload.typ !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // ✅ 1. Tìm refresh token trong DB
      const existingToken = await this.refreshTokenModel.findOne({
        jti: payload.jti,
        userId: payload.sub,
      });

      if (!existingToken) {
        throw new UnauthorizedException('Refresh token not found');
      }

      // ✅ 2. Check token đã revoke hoặc hết hạn
      if (existingToken.isRevoked) {
        throw new UnauthorizedException('Token already used or revoked');
      }

      if (existingToken.expiresAt < new Date()) {
        throw new UnauthorizedException('Refresh token expired');
      }

      // ✅ 3. Revoke token cũ
      existingToken.isRevoked = true;
      await existingToken.save();

      // ✅ 4. Lấy user để tạo token mới
      const user = await this.usersService.findOneById(payload.sub);
      if (!user) throw new UnauthorizedException();

      // ✅ 5. Tạo refresh token mới (rotation)
      const { token: newRefreshToken, jti: newJti } =
        this.signRefreshToken(user);
      await this.saveRefreshToken(user, newRefreshToken, newJti);

      // ✅ 6. Tạo access token mới
      const newAccessToken = this.signAccessToken(user);

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      };
    } catch (err) {
      console.error(err);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logoutAll(userId: string) {
    console.log(
      'Logging out all sessions for userId:',
      new Types.ObjectId(userId),
    );

    const result = await this.refreshTokenModel.updateMany(
      { userId: new Types.ObjectId(userId), isRevoked: false },
      {
        $set: {
          isRevoked: true,
          keepUntil: new Date(Date.now() + 24 * 3600 * 1000),
        },
      },
    );

    return {
      message: 'All sessions logged out successfully',
      modified: result.modifiedCount,
    };
  }
  private async saveRefreshToken(user: any, token: string, jti: string) {
    const decoded = this.jwtService.decode(token) as any;
    const expiresAt = new Date(decoded.exp * 1000); // từ timestamp trong JWT

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
