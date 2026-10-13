import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AUTH_LIMIT } from '../config/rate-limits.js';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import { AUTH_COOKIE, AUTH_COOKIE_MAX_AGE_MS } from './auth.constants.js';
import { AuthService } from './auth.service.js';
import type { AuthUser } from './auth.types.js';
import { CurrentUser } from './current-user.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}
  @ApiOperation({ summary: 'Đăng ký chủ cơ sở (tạo luôn cơ sở đầu tiên)' })
  @Post('register')
  @Throttle(AUTH_LIMIT)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, user } = await this.auth.register(dto);
    res.cookie(AUTH_COOKIE, token, this.cookieOptions());
    return user;
  }
  @ApiOperation({ summary: 'Đăng nhập, server đặt cookie access_token' })
  @Post('login')
  @Throttle(AUTH_LIMIT)
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, user } = await this.auth.login(dto);
    res.cookie(AUTH_COOKIE, token, this.cookieOptions());
    return user;
  }
  @ApiOperation({ summary: 'Đăng xuất, xoá cookie' })
  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE, this.cookieOptions());
  }
  @ApiOperation({ summary: 'Thông tin người đang đăng nhập' })
  @ApiCookieAuth()
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.getProfile(user.id);
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true, // JavaScript trên trình duyệt không đọc được cookie này
      sameSite: 'lax', // không gửi kèm khi bị nhúng từ trang web lạ
      secure: this.config.get('NODE_ENV') === 'production', // production: chỉ qua HTTPS
      path: '/',
      maxAge: AUTH_COOKIE_MAX_AGE_MS,
    };
  }
}
