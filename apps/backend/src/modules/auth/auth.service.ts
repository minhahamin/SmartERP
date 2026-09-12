import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { seedDefaultRoles } from '../../common/seed/default-roles';
import { retryOnDuplicate } from '../../common/utils/retry-on-duplicate';
import { AuthTokenService } from './auth-token.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

type UserWithRole = NonNullable<Awaited<ReturnType<AuthService['findActiveUserByEmail']>>>;

interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    departmentName: string | null;
    position: string | null;
    mustChangePassword: boolean;
    permissions: string[];
  };
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
      include: { role: { include: { rolePermissions: { include: { permission: true } } } }, department: true },
      // 로그인 비밀번호 검증과 issueTokens()의 리프레시 토큰 회전에 실제로 필요해 되살린다
      omit: { passwordHash: false, refreshTokenHash: false },
    });
  }

  async login(dto: LoginDto): Promise<IssuedTokens> {
    const user = await this.findActiveUserByEmail(dto.email);
    if (!user) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    return this.issueTokens(user, dto.rememberMe ?? false);
  }

  /** docs/02 2.4 — 최초 가입자는 회사(Tenant)를 새로 만들고 자동으로 ADMIN 역할을 부여받는다 */
  async register(dto: RegisterDto): Promise<IssuedTokens> {
    return retryOnDuplicate(async () => {
      const created = await this.prisma.$transaction(async (tx) => {
        const company = await tx.company.create({
          data: { name: dto.companyName, bizRegNo: dto.bizRegNo, plan: 'FREE' },
        });
        const roleIdByName = await seedDefaultRoles(tx as never, company.id);
        const passwordHash = await bcrypt.hash(dto.password, 12);
        await tx.user.create({
          data: {
            companyId: company.id,
            employeeNo: 'E-1000',
            email: dto.email,
            passwordHash,
            name: dto.adminName,
            hireDate: new Date(),
            roleId: roleIdByName.ADMIN,
          },
        });
        return company;
      });

      const user = await this.findActiveUserByEmail(dto.email, created.id);
      if (!user) throw new AppException('REGISTRATION_FAILED', '회원가입 처리 중 오류가 발생했습니다.', 500);
      return this.issueTokens(user, false);
    }).catch((error) => {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new AppException('COMPANY_ALREADY_EXISTS', '이미 등록된 사업자등록번호입니다.', 409);
      }
      throw error;
    });
  }

  /**
   * 비밀번호 변경 — 변경 전 탈취된 refresh 토큰이 계속 회전되는 것을 막기 위해
   * 변경 시점에 토큰을 재발급(Rotation)하고, 이전 토큰의 재사용 유예(grace) 기록을
   * 제거한다. 탈취된 refresh는 어느 경로로도 재사용 불가하고, 변경자 본인은
   * 새 토큰으로 세션이 유지된다. (access 토큰은 최대 15분 잔존 — docs/12 한계 명시)
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<IssuedTokens> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { role: { include: { rolePermissions: { include: { permission: true } } } }, department: true },
      omit: { passwordHash: false, refreshTokenHash: false },
    });
    const passwordMatches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    // 401이 아닌 400을 쓴다 — 인증(토큰)은 유효하므로, 프론트엔드 axios 인터셉터가 이를
    // "토큰 만료"로 오인해 /auth/refresh 재시도 후 세션을 끊어버리는 것을 방지한다.
    if (!passwordMatches)
      throw new AppException('INVALID_CURRENT_PASSWORD', '현재 비밀번호가 올바르지 않습니다.', 400);

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });

    const rememberMe =
      !!user.refreshTokenExpiresAt &&
      user.refreshTokenExpiresAt.getTime() - Date.now() > 15 * 24 * 60 * 60 * 1000;
    const issued = await this.issueTokens(user, rememberMe);
    // grace 재사용 경로(previousRefreshTokenHash)까지 제거 — 구 refresh 완전 무효화
    await this.prisma.user.update({
      where: { id: userId },
      data: { previousRefreshTokenHash: null },
    });
    return issued;
  }

  /**
   * docs/12.3 — refresh마다 기존 토큰을 즉시 폐기하고 신규 토큰을 발급한다(Rotation).
   * 이미 회전으로 폐기된 토큰이 재사용되면 탈취로 간주해 해당 사용자의 모든 세션을 강제 종료한다.
   */
  async refresh(refreshToken: string | undefined): Promise<IssuedTokens> {
    if (!refreshToken) throw new UnauthorizedException('Refresh Token이 없습니다. 다시 로그인해 주세요.');
    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);

    const user = await this.prisma.user.findFirst({
      where: { refreshTokenHash: tokenHash },
      include: { role: { include: { rolePermissions: { include: { permission: true } } } }, department: true },
      // issueTokens()의 리프레시 토큰 회전(previousRefreshTokenHash 기록)에 필요해 되살린다
      omit: { refreshTokenHash: false },
    });
    if (user) {
      if (!user.refreshTokenExpiresAt || user.refreshTokenExpiresAt < new Date()) {
        await this.invalidateSessions(user.id);
        throw new UnauthorizedException('Refresh Token이 만료되었습니다. 다시 로그인해 주세요.');
      }
      // rememberMe 만료 축소 방지: 기존 만료가 15일 초과면 장기 세션으로 유지
      const rememberMe = user.refreshTokenExpiresAt.getTime() - Date.now() > 15 * 24 * 60 * 60 * 1000;
      return this.issueTokens(user, rememberMe);
    }

    const reused = await this.prisma.user.findFirst({ where: { previousRefreshTokenHash: tokenHash } });
    if (reused) {
      // 동시 더블클릭/재시도 1회는 정상 재회전으로 흡수하고, 그 이후의 재사용만 탈취로 간주한다.
      // (previous 1개만 보관하므로 2회째 재사용은 매칭이 풀려 아래 invalid로 떨어진다)
      if (!reused.refreshTokenExpiresAt || reused.refreshTokenExpiresAt < new Date()) {
        await this.invalidateSessions(reused.id);
        throw new UnauthorizedException('Refresh Token이 만료되었습니다. 다시 로그인해 주세요.');
      }
      const fresh = await this.prisma.user.findUnique({
        where: { id: reused.id },
        include: { role: { include: { rolePermissions: { include: { permission: true } } } }, department: true },
        omit: { refreshTokenHash: false },
      });
      if (!fresh) throw new UnauthorizedException('유효하지 않은 Refresh Token입니다.');
      const rememberMe = reused.refreshTokenExpiresAt.getTime() - Date.now() > 15 * 24 * 60 * 60 * 1000;
      return this.issueTokens(fresh, rememberMe);
    }

    throw new UnauthorizedException('유효하지 않은 Refresh Token입니다. 다시 로그인해 주세요.');
  }

  async logout(userId: string): Promise<void> {
    await this.invalidateSessions(userId);
  }

  /**
   * 비밀번호 찾기 — 계정 열거 방지용으로 존재 여부와 무관하게 success만 반환한다.
   * 재설정 토큰은 응답에 절대 포함하지 않고(ATO 방지) 운영에서는 이메일로 발송한다.
   * 개발 환경에서는 서버 콘솔에 출력해 데모 흐름을 확인할 수 있게 한다.
   */
  async forgotPassword(email: string): Promise<{ success: true }> {
    const user = await this.prisma.user.findFirst({ where: { email, status: 'ACTIVE' } });
    if (!user) return { success: true };
    const resetToken = this.tokenService.signPasswordResetToken(user.id);
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[auth] password reset token for ${email} (dev only, do not expose via API): ${resetToken}`,
      );
    } else {
      // TODO: 이메일 발송 연동 (resetToken을 메일로 전달)
      void resetToken;
    }
    return { success: true };
  }

  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    let userId: string;
    try {
      userId = this.tokenService.verifyPasswordResetToken(resetToken);
    } catch {
      throw new UnauthorizedException('재설정 토큰이 유효하지 않거나 만료되었습니다.');
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });
    await this.invalidateSessions(userId);
  }

  async getMe(authUser: AuthUser) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: authUser.sub },
      include: {
        role: { include: { rolePermissions: { include: { permission: true } } } },
        department: true,
      },
    });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      departmentName: user.department?.name ?? null,
      position: user.position,
      mustChangePassword: user.mustChangePassword,
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
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        departmentName: user.department?.name ?? null,
        position: user.position,
        mustChangePassword: user.mustChangePassword,
        permissions: user.role.rolePermissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`),
      },
    };
  }
}
