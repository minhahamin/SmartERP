import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // 비밀번호/리프레시 토큰 해시는 어떤 모듈이 User를 조회하든 기본적으로 응답에 노출되지 않는다.
    // 실제로 필요한 곳(AuthService의 로그인/토큰 회전/비밀번호 변경)은 쿼리별로 omit: false를 지정해 되살린다.
    super({
      omit: {
        user: { passwordHash: true, refreshTokenHash: true, previousRefreshTokenHash: true },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
