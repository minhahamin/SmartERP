# 2. 사용자 정의

ERPilot은 4가지 역할(Role)을 1차 분류 기준으로 삼는다. 단, 향후 확장을 고려하여 Role은 하드코딩된 enum이 아니라 **Role 테이블 + Permission 테이블 + RolePermission 매핑 테이블**로 구성된 RBAC(Role-Based Access Control) 모델을 사용한다. 아래 4종은 "시스템 기본 제공(Seed) 역할"이며, 관리자는 권한 관리 화면에서 역할을 추가/수정할 수 있다.

## 2.1 페르소나 정의

### 관리자 (ADMIN)
- **역할**: 시스템 전체 운영 책임자. 보통 대표, IT 담당자, 경영지원팀장.
- **목표**: 전사 데이터 가시성 확보, 조직 구조 변경, 권한 정책 관리, 시스템 설정.
- **주요 페인포인트**: 부서 개편 시 권한 재설정이 번거로움, 누가 어떤 데이터에 접근했는지 추적이 어려움.
- **ERPilot에서의 행동**: 부서/직원 마스터 데이터 관리, 권한 매트릭스 조정, 전사 통계 열람, 공지사항 전사 발행.

### 인사 담당자 (HR_MANAGER)
- **역할**: HR팀 실무자. 채용/근태/급여/평가를 담당.
- **목표**: 직원 정보·근태·급여를 정확하고 신속하게 처리, 휴가 승인, 인사 규정 문서 관리.
- **주요 페인포인트**: 매달 반복되는 급여 산정 작업, 직원들의 반복적인 규정 문의 대응.
- **ERPilot에서의 행동**: 직원 등록/수정, 급여 데이터 입력 및 확정, 휴가 승인/반려, 인사 문서 업로드, AI에게 "이번 달 급여 미확정 인원 알려줘" 질의.

### 영업 담당자 (SALES_MANAGER)
- **역할**: 영업팀 실무자/팀장. 거래처 관리 및 매출 관리를 담당.
- **목표**: 거래처별 영업 현황 파악, 재고 가용성 확인 후 견적/주문 진행, 매출 통계 확인.
- **주요 페인포인트**: 재고 담당 부서에 매번 재고 확인을 요청해야 함, 매출 데이터를 취합하는 데 시간 소요.
- **ERPilot에서의 행동**: 거래처 등록/관리, 제품 단가 조회, 재고 가용 수량 확인(읽기), 매출 통계 대시보드 확인, AI에게 "이번 달 매출 요약해줘" 질의.

### 일반 직원 (EMPLOYEE)
- **역할**: 생산팀/현장직/일반 사무직 등 대부분의 구성원.
- **목표**: 본인 근태/급여 확인, 휴가 신청, 사내 공지 확인, 사내 규정 검색.
- **주요 페인포인트**: 어디서 무슨 문서를 찾아야 할지 모름, ERP 메뉴가 낯설고 복잡함.
- **ERPilot에서의 행동**: 본인 정보 조회, 휴가 신청, 공지사항 확인, AI 챗봇으로 "내 이번 주 근태 알려줘", "연차 규정 알려줘" 질의.

## 2.2 역할별 권한 정의 매트릭스

기호: **C**=Create, **R**=Read, **U**=Update, **D**=Delete, **A**=Approve(승인), **-**=권한 없음, **R(own)**=본인 데이터만 조회 가능, **R(dept)**=소속 부서 데이터만 조회 가능

| 모듈 | ADMIN | HR_MANAGER | SALES_MANAGER | EMPLOYEE |
|---|---|---|---|---|
| 대시보드 | 전사 통계 | 인사 통계 | 영업 통계 | 본인 요약 |
| 직원 관리 | CRUD | CRUD | R(dept) | R(own), U(own 일부 항목) |
| 근태 관리 | CRUD | CRUD, A | R(dept) | C(own 출퇴근), R(own) |
| 급여 관리 | CRUD | CRUD, A | - | R(own) |
| 일정 관리 | CRUD | CRUD | CRUD(own/dept) | CRUD(own), R(공개 일정) |
| 부서 관리 | CRUD | R | R | R |
| 권한 관리 | CRUD | - | - | - |
| 거래처 관리 | CRUD | - | CRUD | R(읽기만, 필요 시) |
| 제품 관리 | CRUD | - | R, U(가격 제외) | R |
| 재고 관리 | CRUD | - | R | R(필요 부서) |
| 입출고 관리 | CRUD | - | C(영업 출고 요청) | C(생산직: 입출고 등록) |
| 생산 관리 | CRUD | - | R | CRUD(own 작업) |
| 문서 관리 | CRUD | CRUD(인사 문서) | CRUD(영업 문서) | R, C(본인 업로드) |
| 공지사항 | CRUD | C(인사 공지) | C(영업 공지) | R |
| 통계 분석 | 전체 | 인사 통계 | 영업 통계 | 본인 통계만 |
| AI 챗봇 | 전체 데이터 질의 가능 | 인사 범위 + 공개 문서 질의 | 영업 범위 + 공개 문서 질의 | 본인 범위 + 공개 문서 질의 |

> **설계 원칙**: 위 매트릭스는 화면(Route Guard) 레벨뿐 아니라 API 레벨(Controller Guard), AI Function Calling 레벨(Tool Argument Injection)에서 3중으로 동일하게 강제된다. 자세한 구현은 [08-api-design.md](08-api-design.md), [09-ai-chatbot-design.md](09-ai-chatbot-design.md), [12-jwt-auth-design.md](12-jwt-auth-design.md)에서 다룬다.

## 2.3 권한 모델 데이터 구조 (개념)

```
User ─── belongsTo ──→ Department
User ─── belongsTo ──→ Role
Role ─── hasMany ──→ RolePermission ──→ Permission
Permission { resource: "PAYROLL", action: "READ" | "WRITE" | "DELETE" | "APPROVE" }
```

- `Permission`은 (resource, action) 조합으로 정의되며, 모듈이 추가될 때마다 Seed 데이터로 확장된다.
- `RolePermission`은 역할-권한 매핑 테이블로, 관리자가 권한 관리 화면에서 토글하면 즉시 반영된다.
- "R(own)"과 같은 스코프 제약은 Permission 테이블이 아니라 **서비스 레이어의 Policy 함수**(예: `canAccessEmployee(user, targetEmployeeId)`)로 처리하여, 단순 RBAC을 넘어선 행(Row) 단위 접근 제어(ABAC 일부 결합)를 구현한다.

## 2.4 가입/온보딩 정책

- ERPilot은 SaaS이므로 회사 단위로 워크스페이스(Tenant)가 생성된다.
- 최초 가입자는 자동으로 ADMIN 역할을 부여받아 워크스페이스를 초기화한다.
- ADMIN은 이후 "직원 관리" 화면에서 임직원을 초대(이메일 발송) → 임직원이 초기 비밀번호를 설정하며 가입을 완료한다.
- 퇴사 처리 시 계정은 삭제되지 않고 `status = RESIGNED`로 비활성화되어, 과거 급여/근태 이력의 정합성을 유지한다(소프트 삭제 원칙).
