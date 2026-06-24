# ERPilot Backend

NestJS + Prisma + PostgreSQL(pgvector) API. 설계 근거: [docs/07](../../docs/07-database-design.md) (DB),
[docs/08](../../docs/08-api-design.md) (API), [docs/02](../../docs/02-users-and-permissions.md) (RBAC),
[docs/12](../../docs/12-jwt-auth-design.md) (인증), [docs/13](../../docs/13-system-architecture.md) (아키텍처),
[docs/14](../../docs/14-deployment-architecture.md) (배포).

## 시작하기

```bash
cp .env.example .env   # DATABASE_URL 등 값 채우기
npm install
npx prisma migrate dev --name init
npm run prisma:seed    # Company/Role/Permission/RolePermission + 데모 계정 4종 생성
npm run dev            # http://localhost:3000/api/v1, Swagger: /api/v1/docs
```

데모 계정(비밀번호는 시드 로그 출력 참고, 기본 `erpilot1234!`):

| 역할 | 이메일 |
|---|---|
| ADMIN | doyoon.kim@erpilot.io |
| HR_MANAGER | yujin.choi@erpilot.io |
| SALES_MANAGER | minjun.kim@erpilot.io |
| EMPLOYEE | jihoon.park@erpilot.io |

## 구조

```
src/
 ├─ common/        # decorators, guards(JwtAuth/Permissions), interceptors, filters, PolicyService
 ├─ prisma/        # PrismaModule/PrismaService (전역)
 └─ modules/       # auth, users, departments, roles, attendance, leave, payroll, schedule,
                    # partners, products, inventory, stock-movements, production, documents,
                    # announcements, statistics, rag, ai-chat, health
```

모든 모듈은 `*.controller.ts / *.service.ts / dto/*.dto.ts` 3분할을 따른다(docs/08 8.2).

## 이번 작업 범위에서 의도적으로 비워둔 부분

- **RAG 색인 / AI Function Calling 실제 구현**: `rag.service.ts`, `ai-chat.service.ts`는 데이터 永속화와
  엔드포인트 골격만 갖추고 있고, 실제 Chunking/Embedding/유사도 검색/GPT Function Calling 오케스트레이션은
  [docs/09](../../docs/09-ai-chatbot-design.md)~[docs/11](../../docs/11-pgvector-design.md) 구현이 필요하다.
- **문서 원본 저장**: docs/13은 S3 Presigned URL을 전제하지만, 이번 작업에서는 로컬 `uploads/` 디렉터리에
  저장한다(AWS 자격 증명 없이도 기능 검증 가능하도록).
- **계정 잠금(5회 실패 시 5분 잠금)**: `/auth/login`의 분당 5회 Rate Limit(docs/12.6)은 구현했지만,
  계정 단위 잠금은 docs/07 스키마에 관련 컬럼이 없어 보류했다. 필요 시 `User`에
  `failedLoginAttempts`/`lockedUntil` 컬럼을 추가하면 된다.
- **docs/07 대비 추가한 컬럼**: `User.baseSalary`(급여 생성 기준), `User.refreshTokenExpiresAt` /
  `User.previousRefreshTokenHash`(docs/12.3 회전·재사용 탐지), `ProductionOrder.warehouseId`(완료 시
  입고될 창고) — 모두 docs가 명시한 동작을 구현하는 데 필요해서 추가했고, 스키마 주석에 근거를 남겼다.
