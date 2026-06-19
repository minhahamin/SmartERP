# 8. API 설계

## 8.1 공통 설계 원칙

- **버전 관리**: 모든 엔드포인트는 `/api/v1` 프리픽스 (`main.ts`에서 `app.setGlobalPrefix('api/v1')`)
- **리소스 중심 RESTful 네이밍**: 동사 대신 명사+HTTP Method (`POST /payrolls/:id/confirm`처럼 상태 전이는 예외적으로 하위 액션 경로 허용)
- **공통 응답 포맷**:
```json
// 성공
{ "success": true, "data": { ... }, "meta": { "page": 1, "limit": 20, "total": 128, "totalPages": 7 } }
// 실패
{ "success": false, "error": { "code": "PAYROLL_ALREADY_CONFIRMED", "message": "이미 확정된 급여입니다.", "statusCode": 409 } }
```
- **페이지네이션**: Query `page`(기본 1), `limit`(기본 20, 최대 100), 응답 `meta`에 `total/totalPages` 포함. 목록형 GET 전체에 일괄 적용.
- **필터/정렬**: Query `sort=-createdAt`(`-`는 내림차순), 도메인별 화이트리스트 필터 파라미터만 허용(임의 컬럼 인젝션 방지)
- **에러 코드 체계**: `{DOMAIN}_{REASON}` 스네이크 대문자 (`PAYROLL_ALREADY_CONFIRMED`, `STOCK_INSUFFICIENT`, `AUTH_INVALID_CREDENTIALS`) — 프론트에서 코드 기준 분기, message는 사용자 노출용 한글 문구
- **멱등성**: 상태 전이 액션(`confirm`, `pay`)은 이미 해당 상태인 경우 200으로 현재 상태를 반환(에러 아님)하여 중복 클릭에 안전

## 8.2 NestJS 모듈 구조

```
src/
 ├─ common/
 │   ├─ decorators/
 │   │   ├─ current-user.decorator.ts   # @CurrentUser() — JWT payload 추출
 │   │   ├─ permissions.decorator.ts    # @RequirePermissions('PAYROLL','APPROVE')
 │   │   └─ public.decorator.ts         # @Public() — Auth Guard 예외
 │   ├─ guards/
 │   │   ├─ jwt-auth.guard.ts
 │   │   └─ permissions.guard.ts
 │   ├─ interceptors/
 │   │   ├─ response.interceptor.ts     # 공통 success 응답 envelope 래핑
 │   │   └─ audit-log.interceptor.ts    # 민감 액션 AuditLog 비동기 기록
 │   └─ filters/
 │       └─ http-exception.filter.ts    # 공통 error envelope 변환
 ├─ prisma/
 │   ├─ prisma.module.ts
 │   └─ prisma.service.ts
 ├─ modules/
 │   ├─ auth/                (login, refresh, logout)
 │   ├─ users/                (직원 관리)
 │   ├─ departments/
 │   ├─ roles/                (권한 관리)
 │   ├─ attendance/
 │   ├─ leave/
 │   ├─ payroll/
 │   ├─ schedule/
 │   ├─ partners/
 │   ├─ products/
 │   ├─ inventory/
 │   ├─ stock-movements/
 │   ├─ production/
 │   ├─ documents/            (문서 관리 + 업로드)
 │   ├─ announcements/
 │   ├─ statistics/
 │   ├─ rag/                  (Chunking/Embedding 파이프라인, 내부 서비스성 모듈)
 │   └─ ai-chat/              (챗봇 엔드포인트, Function Calling 오케스트레이션)
 └─ main.ts
```

각 모듈은 `*.controller.ts / *.service.ts / dto/*.dto.ts` 3분할을 따르며, DB 접근은 항상 `service` 레이어에서만 수행한다(Controller는 Guard 통과 후 DTO 검증된 입력을 service에 위임하는 역할만 수행).

## 8.3 인증/권한 가드 구조 (코드)

```typescript
// common/decorators/permissions.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (resource: string, action: string) =>
  SetMetadata(PERMISSIONS_KEY, { resource, action });
```

```typescript
// common/guards/permissions.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<{ resource: string; action: string }>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true; // 권한 데코레이터 없는 엔드포인트는 인증만 요구

    const { user } = context.switchToHttp().getRequest();
    const hasPermission = await this.prisma.rolePermission.findFirst({
      where: {
        roleId: user.roleId,
        permission: { resource: required.resource, action: required.action },
      },
    });

    if (!hasPermission) {
      throw new ForbiddenException(`'${required.resource}' 리소스에 대한 '${required.action}' 권한이 없습니다.`);
    }
    return true;
  }
}
```

> 권한 체크를 매 요청마다 DB에서 조회하므로 [02-users-and-permissions.md](02-users-and-permissions.md)의 권한 관리 화면에서 토글한 변경이 **즉시(다음 요청부터)** 반영된다. 트래픽이 늘어나면 Role→Permission 매핑을 Redis에 TTL 30초 캐시로 보강할 수 있다(현재는 포트폴리오 범위상 DB 직접 조회로 충분).

## 8.4 모듈별 Endpoint 명세

### 8.4.1 Auth

| Method | Path | 설명 | 권한 | Request | Response |
|---|---|---|---|---|---|
| POST | `/auth/login` | 로그인 | Public | `{ email, password }` | `{ accessToken, refreshToken, user }` |
| POST | `/auth/refresh` | 토큰 재발급 | Public(Refresh Token 필요) | `{ refreshToken }` | `{ accessToken, refreshToken }` |
| POST | `/auth/logout` | 로그아웃(Refresh Token 무효화) | 인증 필요 | - | `{ success: true }` |
| GET | `/auth/me` | 내 프로필 + 권한 조회 | 인증 필요 | - | `{ id, name, role, permissions[] }` |

### 8.4.2 직원 관리 (`/users`)

| Method | Path | 설명 | 권한 | Request | Response |
|---|---|---|---|---|---|
| GET | `/users` | 목록(검색/필터/페이지네이션) | `USER:READ` | Query: `search, departmentId, status, page, limit` | `User[]` + meta |
| GET | `/users/:id` | 상세 | `USER:READ` 또는 본인 | - | `User` |
| POST | `/users` | 등록(초대) | `USER:CREATE` | `CreateUserDto` | `User` |
| PATCH | `/users/:id` | 수정 | `USER:UPDATE` 또는 본인(제한 필드) | `UpdateUserDto` | `User` |
| DELETE | `/users/:id` | 퇴사 처리(소프트 삭제) | `USER:DELETE` | - | `{ success: true }` |
| GET | `/users/:id/attendances` | 근태 이력 | `ATTENDANCE:READ` 또는 본인 | Query: `from, to` | `Attendance[]` |
| GET | `/users/:id/payrolls` | 급여 이력 | `PAYROLL:READ` 또는 본인 | Query: `year` | `Payroll[]` |

**DTO 예시**
```typescript
export class CreateUserDto {
  @IsEmail() email: string;
  @IsString() @MinLength(2) name: string;
  @IsUUID() departmentId: string;
  @IsUUID() roleId: string;
  @IsString() position: string;
  @IsDateString() hireDate: string;
}
```

### 8.4.3 급여 관리 (`/payrolls`)

| Method | Path | 설명 | 권한 |
|---|---|---|---|
| GET | `/payrolls?year=&month=` | 월별 급여 목록 | `PAYROLL:READ` |
| GET | `/payrolls/me?year=` | 본인 급여 이력 | 인증 필요(본인 한정) |
| POST | `/payrolls/generate` | 월별 급여 일괄 생성(DRAFT) | `PAYROLL:CREATE` |
| PATCH | `/payrolls/:id` | 수당/공제 수정(DRAFT만 가능) | `PAYROLL:UPDATE` |
| POST | `/payrolls/:id/confirm` | 확정(DRAFT→CONFIRMED) | `PAYROLL:APPROVE` |
| POST | `/payrolls/:id/pay` | 지급 처리(CONFIRMED→PAID) | `PAYROLL:APPROVE` |
| GET | `/payrolls/:id/payslip` | 급여명세서 PDF 다운로드 | `PAYROLL:READ` 또는 본인 |

### 8.4.4 재고/입출고/생산

| Method | Path | 설명 | 권한 |
|---|---|---|---|
| GET | `/inventory?warehouseId=&belowSafetyStock=` | 재고 현황 | `INVENTORY:READ` |
| POST | `/inventory/stock-take` | 재고 실사 확정(차이분 자동 ADJUST 생성) | `INVENTORY:UPDATE` |
| GET | `/stock-movements?productId=&type=&from=&to=` | 입출고 이력 | `STOCK_MOVEMENT:READ` |
| POST | `/stock-movements` | 입출고 등록 | `STOCK_MOVEMENT:CREATE` |
| GET | `/production-orders?status=` | 생산 오더 목록(지연 필터 포함) | `PRODUCTION:READ` |
| POST | `/production-orders` | 생산 오더 등록 | `PRODUCTION:CREATE` |
| PATCH | `/production-orders/:id/status` | 상태 변경(완료 시 입고 자동 생성) | `PRODUCTION:UPDATE` |

### 8.4.5 문서 관리 (`/documents`)

| Method | Path | 설명 | 권한 |
|---|---|---|---|
| GET | `/documents?category=&search=` | 목록 | `DOCUMENT:READ` |
| POST | `/documents` | 업로드(multipart) → 비동기 RAG 색인 트리거 | `DOCUMENT:CREATE` |
| GET | `/documents/:id` | 상세/메타데이터 | `DOCUMENT:READ` |
| POST | `/documents/:id/versions` | 새 버전 업로드 | `DOCUMENT:UPDATE` |
| GET | `/documents/:id/summary` | AI 요약 결과 조회 | `DOCUMENT:READ` |

### 8.4.6 AI 챗봇 (`/ai`)

| Method | Path | 설명 | 권한 |
|---|---|---|---|
| GET | `/ai/sessions` | 내 대화 세션 목록 | 인증 필요 |
| POST | `/ai/sessions` | 새 세션 생성 | 인증 필요 |
| GET | `/ai/sessions/:id/messages` | 세션 메시지 이력 | 인증 필요(본인 세션만) |
| POST | `/ai/sessions/:id/messages` | 질의 전송 → SSE 스트리밍 응답 | 인증 필요 |
| GET | `/ai/faq?category=` | 게시된 FAQ 목록 | 인증 필요 |

> AI 엔드포인트는 별도의 `@RequirePermissions`를 적용하지 않는다 — 대신 메시지 처리 파이프라인 내부에서 Function Calling 인자에 `req.user`의 권한 범위를 강제 주입한다(상세: [09-ai-chatbot-design.md](09-ai-chatbot-design.md) 4장). 즉 "엔드포인트 권한"이 아니라 "데이터 접근 시점의 권한"으로 제어된다.

나머지 모듈(부서/일정/거래처/제품/공지사항/통계)은 동일한 RESTful 패턴(List-Get-Post-Patch-Delete + 하위 리소스)을 따르며, 상세 DTO는 [07-database-design.md](07-database-design.md)의 데이터 딕셔너리 컬럼과 1:1 대응한다.

## 8.5 NestJS Controller 코드 예시

```typescript
// modules/payroll/payroll.controller.ts
import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PayrollService } from './payroll.service';
import { GeneratePayrollDto, UpdatePayrollDto, PayrollQueryDto } from './dto';

@ApiTags('Payroll')
@ApiBearerAuth()
@Controller('payrolls')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get()
  @RequirePermissions('PAYROLL', 'READ')
  @ApiOperation({ summary: '월별 급여 목록 조회' })
  findAll(@Query() query: PayrollQueryDto, @CurrentUser() user: AuthUser) {
    return this.payrollService.findAll(query, user);
  }

  @Post('generate')
  @RequirePermissions('PAYROLL', 'CREATE')
  @ApiOperation({ summary: '월별 급여 일괄 생성(DRAFT)' })
  generate(@Body() dto: GeneratePayrollDto, @CurrentUser() user: AuthUser) {
    return this.payrollService.generateMonthly(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('PAYROLL', 'UPDATE')
  update(@Param('id') id: string, @Body() dto: UpdatePayrollDto) {
    return this.payrollService.update(id, dto);
  }

  @Post(':id/confirm')
  @RequirePermissions('PAYROLL', 'APPROVE')
  @ApiOperation({ summary: '급여 확정 (DRAFT → CONFIRMED)' })
  confirm(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.payrollService.confirm(id, user);
  }
}
```

```typescript
// modules/ai-chat/ai-chat.controller.ts
import { Controller, Post, Param, Body, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiChatService } from './ai-chat.service';

@Controller('ai/sessions')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post(':id/messages')
  @Sse() // Server-Sent Events로 토큰 스트리밍
  sendMessage(
    @Param('id') sessionId: string,
    @Body('content') content: string,
    @CurrentUser() user: AuthUser,
  ): Observable<{ data: string }> {
    // user.id/role/departmentId가 service 내부 Function Calling 컨텍스트로 전달됨
    return this.aiChatService.streamReply(sessionId, content, user);
  }
}
```

## 8.6 Swagger 문서 예시

`main.ts`에서 `DocumentBuilder`로 메타 정보를 구성하고 `/api/v1/docs`에 노출한다.

```typescript
const config = new DocumentBuilder()
  .setTitle('ERPilot API')
  .setDescription('AI 기반 ERP SaaS 플랫폼 API 문서')
  .setVersion('1.0')
  .addBearerAuth()
  .addTag('Auth').addTag('Payroll').addTag('Inventory').addTag('AI Chat')
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/v1/docs', app, document);
```

위 컨트롤러 데코레이터로부터 생성되는 OpenAPI 스펙 발췌:

```json
{
  "paths": {
    "/api/v1/payrolls/{id}/confirm": {
      "post": {
        "tags": ["Payroll"],
        "summary": "급여 확정 (DRAFT → CONFIRMED)",
        "security": [{ "bearer": [] }],
        "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
        "responses": {
          "200": { "description": "확정 성공", "content": { "application/json": {
            "schema": { "$ref": "#/components/schemas/PayrollResponseDto" } } } },
          "403": { "description": "PAYROLL:APPROVE 권한 없음" },
          "409": { "description": "PAYROLL_ALREADY_CONFIRMED" }
        }
      }
    }
  }
}
```

- `class-validator` + `@ApiProperty()`를 DTO에 함께 사용해 Swagger 스키마와 런타임 유효성 검증을 동시에 보장한다(이중 관리 방지).
- 모든 응답 DTO는 `@ApiResponse({ type: XxxResponseDto })`로 명시하여 프론트엔드가 Swagger에서 생성한 타입(`openapi-typescript` 또는 `swagger-typescript-api`)을 React Query 훅과 바로 연결할 수 있게 한다.
