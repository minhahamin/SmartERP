import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthTokenService } from './auth-token.service';
import type { LoginDto } from './dto/login.dto';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

type UserWithRole = NonNullable<Awaited<ReturnType<AuthService['findActiveUserByEmail']>>>;

interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: { id: string; name: string; email: string; role: string; departmentId: string | null };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: AuthTokenService,
  ) {}

  private findActiveUserByEmail(email: string, companyId?: string) {
    return this.prisma.user.findFirst({
      where: { email, status: 'ACTIVE', ...(companyId ? { companyId } : {}) },
      include: { role: true },
    });
  }

  async login(dto: LoginDto): Promise<IssuedTokens> {
    const user = await this.findActiveUserByEmail(dto.email);
    if (!user) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    return this.issueTokens(user, dto.rememberMe ?? false);
  }

  /**
   * docs/12.3 — refresh마다 기존 토큰을 즉시 폐기하고 신규 토큰을 발급한다(Rotation).
   * 이미 회전으로 폐기된 토큰이 재사용되면 탈취로 간주해 해당 사용자의 모든 세션을 강제 종료한다.
   */
  async refresh(refreshToken: string | undefined): Promise<IssuedTokens> {
    if (!refreshToken) throw new UnauthorizedException('Refresh Token이 없습니다. 다시 로그인해 주세요.');
    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);

    const user = await this.prisma.user.findFirst({ where: { refreshTokenHash: tokenHash }, include: { role: true } });
    if (user) {
      if (!user.refreshTokenExpiresAt || user.refreshTokenExpiresAt < new Date()) {
        await this.invalidateSessions(user.id);
        throw new UnauthorizedException('Refresh Token이 만료되었습니다. 다시 로그인해 주세요.');
      }
      return this.issueTokens(user, false);
    }

    const reused = await this.prisma.user.findFirst({ where: { previousRefreshTokenHash: tokenHash } });
    if (reused) {
      await this.invalidateSessions(reused.id);
      throw new UnauthorizedException('Refresh Token 재사용이 감지되어 모든 세션이 종료되었습니다. 다시 로그인해 주세요.');
    }

    throw new UnauthorizedException('유효하지 않은 Refresh Token입니다. 다시 로그인해 주세요.');
  }

  async logout(userId: string): Promise<void> {
    await this.invalidateSessions(userId);
  }

  async getMe(authUser: AuthUser) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: authUser.sub },
      include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
    });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      departmentId: user.departmentId,
      permissions: user.role.rolePermissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`),
    };
  }

  private async invalidateSessions(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null, previousRefreshTokenHash: null, refreshTokenExpiresAt: null },
    });
  }

  private async issueTokens(user: UserWithRole, rememberMe: boolean): Promise<IssuedTokens> {
    const accessToken = this.tokenService.signAccessToken({
      sub: user.id,
      companyId: user.companyId,
      roleId: user.roleId,
      roleName: user.role.name,
      departmentId: user.departmentId,
    });

    const { token: refreshToken, tokenHash } = this.tokenService.generateRefreshToken();
    const refreshTokenExpiresAt = this.tokenService.getRefreshTokenExpiry(rememberMe);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        previousRefreshTokenHash: user.refreshTokenHash,
        refreshTokenHash: tokenHash,
        refreshTokenExpiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      refreshTokenExpiresAt,
      user: { id: user.id, name: user.name, email: user.email, role: user.role.name, departmentId: user.departmentId },
    };
  }
}
