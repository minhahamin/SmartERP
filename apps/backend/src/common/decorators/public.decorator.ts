import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** JwtAuthGuard를 통과시키는 예외 데코레이터 — 로그인/리프레시 등 인증 전 엔드포인트에 사용 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
