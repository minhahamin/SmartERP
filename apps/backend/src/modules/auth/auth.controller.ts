import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const REFRESH_TOKEN_COOKIE = 'refreshToken';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // docs/12.6 — 분당 5회 제한
  @Post('login')
  @ApiOperation({ summary: '로그인' })
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(body);
    this.setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
    return { accessToken: result.accessToken, user: result.user };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // docs/12.6과 동일하게 분당 5회 제한
  @Post('register')
  @ApiOperation({ summary: '회사 최초 가입 (Tenant 생성 + ADMIN 계정 발급, docs/02 2.4)' })
  async register(@Body() body: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(body);
    this.setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
    return { accessToken: result.accessToken, user: result.user };
  }

  @ApiBearerAuth()
  @HttpCode(200)
  @Post('change-password')
  @ApiOperation({ summary: '비밀번호 변경 (초대 가입자의 최초 비밀번호 변경 포함, docs/02 2.4)' })
  async changePassword(@Body() body: ChangePasswordDto, @CurrentUser() user: AuthUser) {
    await this.authService.changePassword(user.sub, body);
    return { success: true };
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: '토큰 재발급 (httpOnly Cookie의 refreshToken 사용, docs/12.1)' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const result = await this.authService.refresh(cookies?.[REFRESH_TOKEN_COOKIE]);
    this.setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
    return { accessToken: result.accessToken };
  }

  @ApiBearerAuth()
  @HttpCode(200)
  @Post('logout')
  @ApiOperation({ summary: '로그아웃 (Refresh Token 무효화)' })
  async logout(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(user.sub);
    res.clearCookie(REFRESH_TOKEN_COOKIE);
    return { success: true };
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: '내 프로필 + 권한 조회' })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.getMe(user);
  }

  private setRefreshCookie(res: Response, refreshToken: string, expiresAt: Date) {
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt,
    });
  }
}
