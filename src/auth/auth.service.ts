// auth.service.ts (bản vá nhanh)
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

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async validateUser(username: string, pass: string) {
    const user = await this.usersService.findOne(username);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...safe } = user;
      return safe; // đảm bảo không có password
    }
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
    const payload = { sub: String(user._id), typ: 'refresh' };
    const opts: JwtSignOptions = {
      expiresIn: this.config.get('JWT_REFRESH_TTL') ?? '7d',
      issuer: this.config.get('JWT_ISSUER') ?? 'my-app',
      audience: this.config.get('JWT_AUDIENCE') ?? 'my-app-clients',
      jwtid: uuidv4(),
      secret: this.config.get('JWT_REFRESH_SECRET'),
    };
    return this.jwtService.sign(payload, opts);
  }

  async login(user: any) {
    const accessToken = this.signAccessToken(user);
    const refreshToken = this.signRefreshToken(user);
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

    const saltRounds = 12;
    const hashed = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.usersService.create({
      username: dto.username,
      password: hashed,
      role: 'user',
      age: dto.age,
      email: dto.email,
      // tokenVersion: 0, // nếu bạn dùng cơ chế ver
    });

    const accessToken = this.signAccessToken(user);
    const refreshToken = this.signRefreshToken(user);

    const account = {
      _id: user._id ?? user.id,
      username: user.username,
      role: user.role,
    };
    return { access_token: accessToken, refresh_token: refreshToken, account };
  }
  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        issuer: this.config.get('JWT_ISSUER') ?? 'my-app',
        audience: this.config.get('JWT_AUDIENCE') ?? 'my-app-clients',
      });
      if (payload.typ !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }
      const user = await this.usersService.findOneById(payload.sub);
      if (!user) throw new UnauthorizedException();
      const accessToken = this.signAccessToken(user);
      return { access_token: accessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
