# ERPilot

**ERP + Copilot** — 기존 ERP 시스템과 AI 사내 업무 도우미를 결합한 B2B SaaS 플랫폼.

ERP 데이터(직원/급여/재고/생산/거래처)를 관리하는 동시에, AI 챗봇을 통해 자연어로 ERP 데이터를 조회하고 사내 문서를 검색할 수 있다. 단순 CRUD 포트폴리오가 아니라, 실제 중소기업 도입을 가정한 **RBAC, 멀티테넌시, 동시성 처리, AI 권한 격리**까지 고려한 실무형 설계를 목표로 한다.

```
"현재 재고가 100개 이하인 품목 알려줘"
"이번 달 매출 요약해줘"
"신입사원 연차 규정 알려줘"
"생산 지연 중인 작업 목록 보여줘"
"김철수 사원의 이번 주 근태 현황 알려줘"
```

## 기술 스택

| 영역 | 스택 |
|---|---|
| Frontend | React, TypeScript, Vite, React Query, Zustand, React Router, Tailwind CSS, shadcn/ui, Recharts |
| Backend | NestJS, TypeScript, Prisma, PostgreSQL, JWT, Swagger |
| AI | OpenAI API, LangChain, RAG, pgvector |
| Infra | Docker, Nginx, AWS EC2, GitHub Actions |

## 문서 목차

| # | 문서 | 내용 |
|---|---|---|
| 1 | [프로젝트 개요](docs/01-overview.md) | 목표, 해결 문제, 기대 효과, 차별화 포인트 |
| 2 | [사용자 정의](docs/02-users-and-permissions.md) | 4개 역할 페르소나 및 권한 매트릭스 |
| 3 | [기능 명세](docs/03-feature-spec.md) | ERP 14개 모듈 + AI 6개 기능 상세 |
| 4 | [화면 설계](docs/04-screen-design.md) | 전 페이지 목적/기능/구조/UI/흐름 |
| 5 | [UX/UI 디자인 시스템](docs/05-design-system.md) | 컬러/타이포/스페이싱/컴포넌트 정의 |
| 6 | [디자인 시안](docs/06-wireframes.md) | 1440px ASCII 와이어프레임 7종 |
| 7 | [데이터베이스 설계](docs/07-database-design.md) | ERD, 29개 테이블, 인덱스, Prisma Schema |
| 8 | [API 설계](docs/08-api-design.md) | NestJS 모듈 구조, Endpoint, Swagger |
| 9 | [AI 챗봇 설계](docs/09-ai-chatbot-design.md) | Function Calling, RBAC 강제, 프롬프트 전략 |
| 10 | [RAG 설계](docs/10-rag-design.md) | 업로드~답변생성 전체 파이프라인 |
| 11 | [pgvector 설계](docs/11-pgvector-design.md) | 테이블/인덱스/유사도 검색 SQL |
| 12 | [JWT 인증 설계](docs/12-jwt-auth-design.md) | Access/Refresh Token, Guard, 보안 |
| 13 | [시스템 아키텍처](docs/13-system-architecture.md) | 전체 구조도 및 요청 흐름 |
| 14 | [배포 아키텍처](docs/14-deployment-architecture.md) | Docker/Nginx/GitHub Actions/EC2 |
| 15 | [포트폴리오 발표 자료](docs/15-portfolio-presentation.md) | 면접 대비 발표 스크립트 |

## 핵심 차별화 포인트

1. **AI 계층까지 일관된 RBAC** — Function Calling 인자를 서버가 신뢰하지 않고 호출자의 실제 권한으로 강제 재작성([09](docs/09-ai-chatbot-design.md) 9.3)
2. **정형/비정형 데이터 하이브리드 질의** — ERP DB 조회(Function Calling)와 사내 문서 검색(RAG)을 의도 분류로 자동 라우팅
3. **단일 DB로 OLTP + 벡터 검색 처리** — 별도 Vector DB 없이 PostgreSQL + pgvector로 트랜잭션 데이터와 벡터를 함께 관리([11](docs/11-pgvector-design.md) 11.6)
4. **SaaS 멀티테넌시 설계** — Company 단위 데이터 격리, Postgres RLS 확장 여지를 둔 스키마 설계
