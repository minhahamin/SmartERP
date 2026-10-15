# ERPilot

> Made by 홍민하

[![CI](https://github.com/minhahamin/SmartERP/actions/workflows/ci.yml/badge.svg)](https://github.com/minhahamin/SmartERP/actions/workflows/ci.yml)

**ERP + Copilot** — 기존 ERP 시스템과 AI 사내 업무 도우미를 결합한 B2B SaaS 플랫폼.

ERP 데이터(직원/급여/재고/생산/거래처)를 관리하는 동시에, AI 챗봇을 통해 자연어로 ERP 데이터를 조회하고 사내 문서를 검색할 수 있다. 단순 CRUD 포트폴리오가 아니라, 실제 중소기업 도입을 가정한 **RBAC, 멀티테넌시, 동시성 처리, AI 권한 격리**까지 고려한 실무형 설계를 목표로 한다.

```
"현재 재고가 100개 이하인 품목 알려줘"
"이번 달 매출 요약해줘"
"연차 신청해줘, 다음 주 월요일 하루"
"생산 지연 중인 작업 목록 보여줘"
"김철수 사원의 이번 주 근태 현황 알려줘"
```

## 스크린샷

### AI 어시스턴트 — 자연어 조회 (Function Calling → 실데이터 답변)

![AI 조회](docs/screenshots/03-ai-query.png)

### AI 어시스턴트 — 액션 제안 ("연차 신청해줘" → 확인 카드 → 사용자가 눌러야 반영)

![AI 액션 제안](docs/screenshots/04-ai-action-draft.png)

"확인하고 진행"을 누르면 기존 휴가 서비스를 그대로 거쳐 실제 신청이 접수되고, 카드는 "접수 완료"로 바뀝니다.

![AI 액션 확정](docs/screenshots/24-ai-action-confirmed.png)

### 대시보드 — 매출 추이 · 안전재고 경고 · 최근 공지

![대시보드](docs/screenshots/02-dashboard.png)

### FAQ 관리 — AI가 반복 질문으로 만든 후보를 사람이 게시/반려하는 검수 큐

![FAQ 검수 큐](docs/screenshots/05-faq-review.png)

### 생산 관리 — 상태 전이(계획→진행→지연→완료) 칸반

![생산 관리](docs/screenshots/06-production.png)

### 로그인 — 데모 계정 원클릭 체험

![로그인](docs/screenshots/01-login.png)

## 기술 스택

| 영역 | 스택 |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Query, Zustand, React Router, Tailwind CSS, shadcn/ui, Recharts |
| Backend | NestJS, TypeScript, Prisma, PostgreSQL, JWT, Swagger |
| AI | Google Gemini API(`gemini-2.5-flash`) Function Calling, 역할 기반 도구 오케스트레이션 |
| Infra | Docker(멀티스테이지 빌드), Railway (Frontend/Backend 개별 배포) |

## 아키텍처

```mermaid
flowchart TB
    subgraph Client["클라이언트"]
        Browser["React SPA (Vite Build)\nReact Query + Zustand"]
    end

    subgraph Railway["Railway"]
        FE["Frontend 컨테이너\nNginx + 정적 파일"]
        API["Backend 컨테이너\nNestJS API (REST + Swagger)"]
        PG[("PostgreSQL\n+ pgvector Extension(스키마 준비)")]
    end

    subgraph External["외부 서비스"]
        Gemini["Google Gemini API\nFunction Calling / 요약"]
    end

    Browser -- HTTPS --> FE
    Browser -- "/api/v1/*" --> API
    API -- "Prisma Client" --> PG
    API -- "도구 호출 / 문서 요약" --> Gemini
```

**설계와 구현의 차이(의도적 단순화)** — 이 프로젝트는 `docs/09~11`, `docs/13~15`에 처음 목표로 삼은 아키텍처(OpenAI + LangChain, pgvector 유사도 검색, Redis/BullMQ 색인 큐, AWS EC2 + Nginx + GitHub Actions)를 먼저 설계했다. 실제 구현에서는 포트폴리오 규모에 맞춰 다음과 같이 의도적으로 단순화했고, 근거는 코드 주석에 남겨두었다.

| 설계 문서 기준 | 실제 구현 | 이유 |
|---|---|---|
| OpenAI GPT-4o + LangChain | Google Gemini(`@google/genai`) 직접 호출 | 동일한 Function Calling 오케스트레이션을 더 적은 의존성으로 구현 |
| pgvector 임베딩 유사도 검색 | 문서 제목/요약 키워드 매칭 (`DocumentChunk` + `vector(1536)` 컬럼은 스키마에 준비만 해둠) | 별도 색인 파이프라인 없이도 핵심 가치(권한 인지 검색)를 먼저 증명 |
| Redis + BullMQ 비동기 색인 큐 | 온디맨드 동기 처리(관리자가 트리거) | 별도 큐 인프라 없이 동일 기능을 단순 경로로 구현 |
| AWS EC2 + Docker Compose + Nginx + GitHub Actions | Railway (Frontend/Backend 각각 Dockerfile 배포) | 포트폴리오 규모에서 운영 부담을 낮추면서 컨테이너 기반 배포 경험은 유지 |

즉, **AI 계층까지 일관되게 강제하는 RBAC 구조**(아래 참고)는 설계 그대로 구현했고, 그 외 인프라/검색 고도화는 "확장 가능하게 스키마만 준비 + 단순 경로로 우선 구현"하는 방식을 택했다.

## AI 어시스턴트 — 실제 구현 기능

`Gemini 2.5 Flash` function calling 기반 오케스트레이션 (턴당 최대 4회 도구 호출, 최근 대화 10턴 유지).

### 1. 조회(READ) 도구 — 11종

| 분류 | 도구 | 설명 |
|---|---|---|
| 재고 | `getLowStockProducts` / `getInventoryByProduct` | 안전재고 미달 전체 조회 / 특정 제품 창고별 재고 |
| 제품 | `getProductInfo` | 단가·원가·SKU·안전재고 |
| 영업 | `getSalesSummary` | 월별 매출 합계·주문 목록 |
| 거래처 | `getPartnerInfo` | 이름 검색 또는 상위 거래처 목록 |
| 생산 | `getProductionOrdersByStatus` | 상태별 생산 오더(기본: 진행중+지연) |
| 인사 | `getAttendanceSummary` / `getPayrollStatus` / `getLeaveBalance` / `getEmployeeDirectory` | 근태·급여·연차잔액·사내 연락처(본인 우선, ADMIN/HR_MANAGER만 타인 조회) |
| 공지 | `getAnnouncements` | 역할별로 볼 수 있는 공지 |
| 문서 | `searchInternalDocuments` | 사내 문서 제목/요약 키워드 검색 |

### 2. 액션 제안 — "제안 → 사람 확인 → 확정" (3종)

AI는 데이터를 직접 바꾸지 않고 **초안(Draft)만** 만든다. 화면에 뜨는 확인 카드에서 사용자가 직접 눌러야 실제로 반영되며, 10분이 지나면 자동 만료된다.

- `draftLeaveRequest` — 연차/반차/병가 신청 (self-service, 전 역할)
- `draftAnnouncement` — 공지 작성 (`ANNOUNCEMENT:CREATE` 권한자만 노출)
- `draftProductionStatusUpdate` — 생산 오더 상태 변경 (담당자 본인 또는 ADMIN만)

확정(confirm) 시 AI 전용 로직이 아니라 기존 도메인 서비스(`LeaveService.create()` 등)를 그대로 호출해, 수동 화면에서 신청하는 것과 완전히 동일한 검증/트랜잭션 경로를 탄다. 휴가 신청서·공지문은 PDF로 내보낼 수 있다.

### 3. 권한 격리 — 이중 방어

1. **노출 단계**: 호출자의 `RolePermission`에 해당 리소스 `READ` 권한이 없으면 도구 자체를 목록에서 제외 (LLM은 애초에 그 도구의 존재를 모른다)
2. **실행 단계**: `EMPLOYEE`는 조회 대상을 본인으로 강제하고, 모든 쿼리에 `companyId` 스코프를 건다 — LLM이 인자를 잘못/악의적으로 채워도 서버가 실제 권한으로 덮어씀

질문에 포함된 키워드로 관련 도구만 1차로 좁혀 모델에 제공해, 엉뚱한 도구 선택이나 인자 지어내기(hallucination)를 줄인다.

### 4. FAQ 자동화 (Human-in-the-loop)

- 반복 질문을 정규화해 집계한 뒤, 임계치 이상 반복된 그룹만 Gemini로 클러스터링해 대표 질문/답변 후보를 생성
- 모델이 만든 임계치·중복 여부를 서버가 재검증(모델 출력을 그대로 신뢰하지 않는다는 프로젝트 전반의 원칙)
- 후보는 "검수 대기" 상태로 쌓이고, 관리자가 게시/반려하는 사람 검수 큐를 거쳐 사용자에게 노출

## ERP 핵심 업무 화면

| 영역 | 화면 |
|---|---|
| 대시보드 | 매출/재고/공지 요약, AI 어시스턴트 진입 |
| 인사 | 직원 관리, 부서 관리, 권한 관리(RBAC), 급여 관리, 근태(직원 상세 내 포함) |
| 영업/공급망 | 거래처 관리, 제품 관리, 재고 관리, 입출고 관리, 생산 관리, 수주(영업) 관리 |
| 지식/커뮤니케이션 | 문서 관리(업로드 + AI 요약), 공지사항, FAQ 관리 |
| 분석 | 통계 분석 대시보드 |
| 일정 | 멀티데이 일정을 캘린더 바(bar)로 표시하는 일정 관리 |

### 화면 갤러리 (사이드바 전 모듈, ADMIN 계정 기준)

**인사**

| 직원 관리 | 급여 관리 |
|---|---|
| ![직원 관리](docs/screenshots/07-employees.png) | ![급여 관리](docs/screenshots/08-payroll.png) |
| **일정 관리** | **부서 관리** |
| ![일정 관리](docs/screenshots/09-schedule.png) | ![부서 관리](docs/screenshots/10-departments.png) |

**권한 관리 (RBAC 매트릭스)**

![권한 관리](docs/screenshots/11-permissions.png)

**영업/생산**

| 거래처 관리 | 영업(수주) 관리 |
|---|---|
| ![거래처 관리](docs/screenshots/12-partners.png) | ![영업 관리](docs/screenshots/13-sales-orders.png) |
| **제품 관리** | **재고 관리** |
| ![제품 관리](docs/screenshots/14-products.png) | ![재고 관리](docs/screenshots/15-inventory.png) |
| **입출고 관리** | **생산 관리** |
| ![입출고 관리](docs/screenshots/16-stock-movements.png) | ![생산 관리](docs/screenshots/06-production.png) |

**공유**

| 문서 관리 | 공지사항 |
|---|---|
| ![문서 관리](docs/screenshots/17-documents.png) | ![공지사항](docs/screenshots/18-announcements.png) |

**통계 분석 (매출 / 재고 / 인사 탭)**

| 매출 | 재고 | 인사 |
|---|---|---|
| ![통계-매출](docs/screenshots/19-statistics-sales.png) | ![통계-재고](docs/screenshots/20-statistics-inventory.png) | ![통계-인사](docs/screenshots/21-statistics-hr.png) |

**계정 · 검색**

| 비밀번호 찾기 (링크는 15분 · 1회용) | 전체 검색 (직원/제품/생산 오더/거래처/공지) |
|---|---|
| ![비밀번호 찾기](docs/screenshots/22b-forgot-password-sent.png) | ![전체 검색](docs/screenshots/23-global-search.png) |

## 핵심 차별화 포인트

1. **AI 계층까지 일관된 RBAC** — 노출 단계(도구 목록 필터링)와 실행 단계(호출자 실제 권한으로 스코프 강제) 이중 방어. LLM이 잘못된 인자를 만들어도 서버가 신뢰하지 않는다([09](docs/09-ai-chatbot-design.md) 9.3)
2. **정형/비정형 데이터 통합 질의** — ERP DB 조회(Function Calling)와 사내 문서 검색을 한 대화 인터페이스에서 자연스럽게 오간다
3. **제안 → 확인 → 확정 패턴** — AI가 만든 초안은 기존 도메인 서비스의 검증/트랜잭션을 그대로 통과해야 확정되어, "AI가 실수로 데이터를 바꾸는" 리스크를 구조적으로 차단
4. **SaaS 멀티테넌시 설계** — Company 단위 데이터 격리, Role-Permission 매핑으로 회사마다 다른 권한 체계를 지원

## 시작하기

```bash
# 1) DB (PostgreSQL + pgvector — 초기 마이그레이션이 CREATE EXTENSION vector를 실행하므로 필수)
#    로컬에 없다면: docker run -d --name erpilot-db -p 5432:5432 \
#      -e POSTGRES_USER=erpilot -e POSTGRES_PASSWORD=erpilot -e POSTGRES_DB=erpilot pgvector/pgvector:pg16
cp apps/backend/.env.example apps/backend/.env   # DATABASE_URL, GEMINI_API_KEY 등 채우기

# 2) Backend
cd apps/backend
npm install
npx prisma migrate dev
npm run prisma:seed          # 회사/역할/권한 + 데모 계정 4종
npm run prisma:seed-demo-all # ERP 데모 데이터(5~12월) + FAQ 후보 + 오늘 날짜 기준 정리(아래 설명)
npm run dev                  # http://localhost:3000/api/v1 (Swagger: /api/v1/docs)

# 3) Frontend
cd apps/frontend
npm install
npm run dev                  # http://localhost:5173
```

> **데모 데이터와 "오늘"** — 시드의 달력은 5~12월로 고정돼 있어, 그대로 두면 앱이 쓰는 실제 시계와 어긋납니다
> (미래 날짜인데 이미 "출고완료"인 수주, 마감 전인데 "지연"인 생산 오더 등).
> `prisma:seed-demo-all`의 마지막 단계인 `prisma:normalize-demo`가 **실행 시점의 오늘(KST)** 기준으로 모순된 레코드만 바로잡으며, 여러 번 실행해도 결과가 같습니다(멱등).
> 이미 시드된 DB(예: 배포 환경)에는 `npm run prisma:normalize-demo`만 실행하면 됩니다.

비밀번호 재설정 메일(선택): `.env`에 `SMTP_HOST` 등을 채우면 실제로 발송하고, 비워 두면 개발 환경에서 **서버 로그에 재설정 링크**가 출력됩니다.

테스트 (DB 없이 실행되는 단위 테스트 — AI 도구 권한 격리, 제안→확인 패턴, 매출 집계, 재설정 토큰 1회용, Gemini 일시 오류 재시도 등):

```bash
cd apps/backend
npm test
```

데모 계정(로그인 화면에서 원클릭 채우기 지원, 비밀번호 기본 `erpilot1234!`):

| 역할 | 이메일 |
|---|---|
| ADMIN | doyoon.kim@erpilot.io |
| HR_MANAGER | yujin.choi@erpilot.io |
| SALES_MANAGER | minjun.kim@erpilot.io |
| EMPLOYEE | jihoon.park@erpilot.io |

## 문서 목차

설계 초기에 목표 아키텍처를 폭넓게 정리한 문서들이다. 위 "아키텍처" 섹션의 표에 정리했듯, `09`~`11`·`13`~`15`는 실제 구현보다 더 큰 목표 설계(OpenAI/LangChain/pgvector 유사도 검색/AWS 배포 등)를 담고 있다 — 왜 그렇게 설계했는지, 그리고 실제로는 왜/어떻게 단순화했는지 함께 보면 설계와 구현 사이의 트레이드오프 판단 과정을 볼 수 있다.

| # | 문서 | 내용 |
|---|---|---|
| 1 | [프로젝트 개요](docs/01-overview.md) | 목표, 해결 문제, 기대 효과, 차별화 포인트 |
| 2 | [사용자 정의](docs/02-users-and-permissions.md) | 4개 역할 페르소나 및 권한 매트릭스 |
| 3 | [기능 명세](docs/03-feature-spec.md) | ERP 핵심 모듈 + AI 기능 상세 |
| 4 | [화면 설계](docs/04-screen-design.md) | 전 페이지 목적/기능/구조/UI/흐름 |
| 5 | [UX/UI 디자인 시스템](docs/05-design-system.md) | 컬러/타이포/스페이싱/컴포넌트 정의 |
| 6 | [디자인 시안](docs/06-wireframes.md) | 1440px ASCII 와이어프레임 7종 |
| 7 | [데이터베이스 설계](docs/07-database-design.md) | ERD, 테이블, 인덱스, Prisma Schema |
| 8 | [API 설계](docs/08-api-design.md) | NestJS 모듈 구조, Endpoint, Swagger |
| 9 | [AI 챗봇 설계](docs/09-ai-chatbot-design.md) | Function Calling, RBAC 강제, 프롬프트 전략 (목표 설계) |
| 10 | [RAG 설계](docs/10-rag-design.md) | 업로드~답변생성 전체 파이프라인 (목표 설계) |
| 11 | [pgvector 설계](docs/11-pgvector-design.md) | 테이블/인덱스/유사도 검색 SQL (목표 설계, 스키마만 반영) |
| 12 | [JWT 인증 설계](docs/12-jwt-auth-design.md) | Access/Refresh Token, Guard, 보안 |
| 13 | [시스템 아키텍처](docs/13-system-architecture.md) | 목표 아키텍처 구조도 및 요청 흐름 |
| 14 | [배포 아키텍처](docs/14-deployment-architecture.md) | 목표 배포안(AWS 기준) — 실제 배포는 Railway |
| 15 | [포트폴리오 발표 자료](docs/15-portfolio-presentation.md) | 면접 대비 발표 스크립트(목표 설계 기준, 위 표 참고) |
