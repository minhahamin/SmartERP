import { randomBytes, createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

/**
 * docs/12-jwt-auth-design.md 12.2 — JwtModule을 별도 서비스로 캡슐화해, 향후 마이크로서비스
 * 분리 시 HS256(공유 비밀키) → RS256(공개키 검증)으로 전환해도 호출부(AuthService)가 영향받지 않게 한다.
 */
@Injectable()
export class AuthTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  signAccessToken(payload: Omit<AuthUser, 'iat' | 'exp'>): string {
    return this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      // ConfigService가 반환하는 plain string은 jsonwebtoken의 `StringValue` 리터럴 타입과
      // 호환되지 않아 캐스팅이 필요하다(런타임 파싱은 'ms' 패키지가 동일하게 처리).
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expiresIn: (this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m') as any,
    });
  }

  /** opaque random token — 자체 정보를 담지 않아 페이로드 위조/디코딩 시도 자체를 무의미하게 만든다 (12.3) */
  generateRefreshToken(): { token: string; tokenHash: string } {
    const token = randomBytes(64).toString('hex');
    return { token, tokenHash: this.hashRefreshToken(token) };
  }

  /** DB에는 원문이 아닌 sha256 해시만 저장 — DB 유출 시에도 토큰 복구 불가 (12.3) */
  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  getRefreshTokenExpiry(rememberMe: boolean): Date {
    const days = rememberMe
      ? Number(this.config.get('REFRESH_TOKEN_EXPIRES_DAYS_REMEMBER_ME') ?? 30)
      : Number(this.config.get('REFRESH_TOKEN_EXPIRES_DAYS') ?? 14);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}
