import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import type { AuthUser } from '../../../common/interfaces/auth-user.interface';

/** docs/12-jwt-auth-design.md 12.5 — payload를 그대로 신뢰하지 않고 매 요청 신선도를 검증한다 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET')!,
    });
  }

  async validate(payload: AuthUser): Promise<AuthUser> {
    // 퇴사/비활성·역할/부서 변경을 Access 만료(15m) 전에도 반영한다
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: { select: { name: true } } },
    });
    if (!user || user.status !== 'ACTIVE' || user.companyId !== payload.companyId) {
      throw new UnauthorizedException('세션이 만료되었거나 권한이 변경되었습니다.');
    }
    return {
      sub: user.id,
      companyId: user.companyId,
      roleId: user.roleId,
      roleName: user.role.name,
      departmentId: user.departmentId,
    };
  }
}
