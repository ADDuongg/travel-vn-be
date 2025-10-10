// auth.controller.ts
import {
  Body,
  Controller,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from 'src/pipe/zod-validation.pipe';
import { LoginDtoSchema } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ApiBody } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['username', 'password'],
      properties: {
        username: { type: 'string', example: 'duong.nguyen' },
        password: { type: 'string', format: 'password', example: 'Aa123456!' },
      },
    },
  })
  @UsePipes(new ZodValidationPipe(LoginDtoSchema))
  async login(@Body() dto: any) {
    const user = await this.authService.validateUser(
      dto.username,
      dto.password,
    );
    if (!user) throw new UnauthorizedException();
    return this.authService.login(user);
  }
  @Post('refresh')
  async refresh(@Body('refresh_token') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.authService.register(registerDto);
    return user;
  }
}
