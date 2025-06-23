// auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user._id, role: user.role };
    console.log('payload', payload);
    console.log('user from login', user);

    const accessToken = this.jwtService.sign(payload, { expiresIn: '1m' });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: 'refresh_secret',
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      account: user,
    };
  }
  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: 'refresh_secret',
      });
      const accessToken = this.jwtService.sign(
        { username: payload.username, sub: payload.sub, role: payload.role },
        { expiresIn: '15m' },
      );

      return { access_token: accessToken };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
