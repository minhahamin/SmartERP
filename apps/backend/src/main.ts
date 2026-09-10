import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { buildSwaggerDocument } from './swagger.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // helmet 기본값(crossOriginResourcePolicy: same-origin)은 프론트엔드(다른 포트/오리진)가
  // /uploads의 이미지를 <img>로 불러오는 것까지 막아버린다 — CORS와는 별도의 차단이라
  // enableCors만으로는 풀리지 않는다. cross-origin으로 완화해 정적 파일을 정상 임베드한다.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());
  // helmet의 X-Frame-Options: SAMEORIGIN / CSP frame-ancestors 'self'는 문서 관리 화면이
  // PDF를 <iframe>으로 미리보기하는 것도 막는다(다른 포트=다른 오리진) — /uploads만 프론트 오리진의
  // 프레이밍을 허용한다.
  // CORS_ORIGIN은 콤마 구분 다중 오리진 지원 (예: "https://fe.up.railway.app,http://localhost:5173")
  const corsOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.use('/uploads', (_req: Request, res: Response, next: NextFunction) => {
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', `frame-ancestors 'self' ${corsOrigins.join(' ')}`);
    next();
  });
  // 문서 원본(/uploads/documents)은 인증 기반 GET /documents/:id/file 로만 제공한다.
  // 디렉터리 통째 정적 서빙은 전역 가드(JWT/Permissions)보다 앞선 Express 미들웨어라
  // DOCUMENT:READ 권한을 우회하므로 금지. 상품 이미지(/uploads/products)는 <img> 직접
  // 로딩용으로만 공개한다 (UUID 파일명 + 비민감 카탈로그 자산, 목록 API 자체는 인증 필요).
  app.useStaticAssets(join(process.cwd(), 'uploads', 'products'), { prefix: '/uploads/products' });
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // docs/08-api-design.md 8.1 — 모든 엔드포인트는 /api/v1 프리픽스
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerDocument = buildSwaggerDocument(app);
  SwaggerModule.setup('api/v1/docs', app, swaggerDocument, {
    swaggerOptions: { persistAuthorization: true, tagsSorter: 'alpha' },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

void bootstrap();
