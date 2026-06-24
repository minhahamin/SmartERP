import { writeFileSync } from 'fs';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { buildSwaggerDocument } from '../src/swagger.config';

/**
 * DB 연결 없이 OpenAPI 스펙만 추출한다 — NestFactory.create()는 DI 그래프만 구성하고
 * onModuleInit(예: PrismaService.$connect())은 app.listen()/init() 시점에야 실행되므로,
 * listen()을 호출하지 않으면 PostgreSQL이 없어도 스펙을 생성할 수 있다.
 */
async function main() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.setGlobalPrefix('api/v1'); // main.ts와 동일하게 설정해야 실제 서버와 경로가 일치한다
  const document = buildSwaggerDocument(app);
  const outPath = join(process.cwd(), 'openapi.json');
  writeFileSync(outPath, JSON.stringify(document, null, 2));
  console.log(`OpenAPI 스펙을 ${outPath}에 저장했습니다. (paths: ${Object.keys(document.paths).length}개)`);
  await app.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
