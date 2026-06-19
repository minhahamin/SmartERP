# 5. UX/UI 디자인 시스템

## 5.1 디자인 컨셉

> **"Linear의 속도감 + Notion의 정돈된 콘텐츠 밀도 + Slack의 친근한 커뮤니케이션 + Jira의 업무 추적성"**

| 레퍼런스 | ERPilot이 차용한 요소 |
|---|---|
| Linear | 빠른 키보드 내비게이션 느낌의 미니멀 UI, 채도 낮은 다크 사이드바, 또렷한 강조색 1개 |
| Notion | 콘텐츠 영역의 넉넉한 여백과 타이포그래피 위계, 문서/텍스트 중심 화면의 가독성 |
| Slack | 채팅(AI 챗봇) UI의 말풍선 톤, 친근하지만 절제된 컬러 사용 |
| Jira | 테이블/칸반의 상태 Badge 컬러 체계, 데이터 밀도가 높은 화면에서의 정보 위계 |

**스타일 원칙**: 현대적인 B2B SaaS, Enterprise ERP, 미니멀, 실무 중심(장식 최소화, 정보 전달 최우선), 다크 사이드바 + 라이트 콘텐츠 영역의 명확한 대비.

## 5.2 색상 시스템 (Color System)

### Primary / Brand
| 토큰 | HEX | 용도 |
|---|---|---|
| `primary-50` | #EEF2FF | 강조 영역 배경(hover, selected row) |
| `primary-100` | #E0E7FF | 배지 배경 |
| `primary-500` | #6366F1 | **Primary Brand Color** (Indigo) — 버튼, 링크, 포커스 링 |
| `primary-600` | #4F46E5 | 버튼 hover |
| `primary-700` | #4338CA | 버튼 active |

### Neutral (Sidebar = Dark / Content = Light)
| 토큰 | HEX | 용도 |
|---|---|---|
| `gray-900` | #0F172A | 사이드바 배경 |
| `gray-800` | #1E293B | 사이드바 hover 배경 |
| `gray-700` | #334155 | 사이드바 보더 |
| `gray-500` | #64748B | 사이드바 비활성 텍스트 |
| `gray-100` | #F1F5F9 | 콘텐츠 영역 배경 |
| `white` | #FFFFFF | 카드/테이블 배경 |
| `gray-200` | #E2E8F0 | 콘텐츠 영역 보더/디바이더 |
| `gray-400` | #94A3B8 | placeholder, 보조 텍스트 |
| `gray-700(content)` | #334155 | 본문 텍스트 |
| `gray-900(content)` | #0F172A | 헤딩 텍스트 |

### Semantic (상태/피드백)
| 토큰 | HEX | 용도 |
|---|---|---|
| `success-500` | #10B981 | 완료/정상/입고(+) |
| `success-100` | #D1FAE5 | success Badge 배경 |
| `warning-500` | #F59E0B | 경고/지연/안전재고 미달 |
| `warning-100` | #FEF3C7 | warning Badge 배경 |
| `danger-500` | #EF4444 | 오류/삭제/출고(-) |
| `danger-100` | #FEE2E2 | danger Badge 배경 |
| `info-500` | #3B82F6 | 안내/진행중 |
| `info-100` | #DBEAFE | info Badge 배경 |

### AI 전용 액센트
| 토큰 | HEX | 용도 |
|---|---|---|
| `ai-accent` | #8B5CF6 (Violet) | AI 챗봇 관련 요소(아이콘, 말풍선, 플로팅 버튼) — ERP의 Indigo와 구분되는 보조 브랜드 컬러로 "AI 기능임"을 시각적으로 즉시 인지시킴 |

## 5.3 Typography

- **폰트 패밀리**: `Inter` (영문/숫자), `Pretendard` (한글) — 둘 다 가변폭 산세리프, B2B SaaS에서 가장 보편적으로 쓰이는 조합
- **숫자 전용 컬럼(금액/수량)**: `tabular-nums` 적용하여 표 정렬 시 자릿수 흔들림 방지

| 스타일 토큰 | 크기/줄높이 | 굵기 | 용도 |
|---|---|---|---|
| `text-display` | 32px / 40px | 700 | 페이지 타이틀(대시보드 등 최상위) |
| `text-h1` | 24px / 32px | 700 | 페이지 헤더 |
| `text-h2` | 20px / 28px | 600 | 섹션 헤더, 카드 타이틀 |
| `text-h3` | 16px / 24px | 600 | 서브 섹션, 모달 타이틀 |
| `text-body` | 14px / 20px | 400 | 기본 본문, 테이블 셀 |
| `text-body-medium` | 14px / 20px | 500 | 강조 본문, 폼 레이블 |
| `text-small` | 12px / 16px | 400 | 보조 설명, 타임스탬프 |
| `text-caption` | 11px / 14px | 500 | Badge, Tag 내부 텍스트(대문자 + letter-spacing 0.02em) |

## 5.4 Spacing

8px 기반 스케일을 기본으로 하되, 컴포넌트 내부 밀도를 위해 4px 단위를 보조로 사용한다.

| 토큰 | 값 | 용도 |
|---|---|---|
| `space-1` | 4px | 아이콘-텍스트 간격, Badge 내부 패딩 |
| `space-2` | 8px | 폼 요소 내부 패딩(세로) |
| `space-3` | 12px | Input/Button 내부 패딩(세로), 카드 내부 요소 간격 |
| `space-4` | 16px | 카드 내부 패딩, 컴포넌트 간 기본 간격 |
| `space-6` | 24px | 섹션 간 간격, 카드 외부 마진 |
| `space-8` | 32px | 페이지 상하 패딩 |
| `space-12` | 48px | 페이지 좌우 패딩(콘텐츠 영역) |

**레이아웃 그리드**: 1440px 기준 콘텐츠 영역은 `좌측 사이드바 240px + 콘텐츠 max-width 1200px(좌우 패딩 24px씩)`. 12 컬럼 그리드, 컬럼 거터 24px.

## 5.5 Elevation & Radius

| 토큰 | 값 | 용도 |
|---|---|---|
| `radius-sm` | 6px | Badge, Tag, Input |
| `radius-md` | 8px | Button, Card, Modal |
| `radius-lg` | 12px | 대형 카드, 챗봇 패널 |
| `shadow-sm` | `0 1px 2px rgba(15,23,42,0.06)` | 카드 기본 |
| `shadow-md` | `0 4px 12px rgba(15,23,42,0.10)` | Dropdown, Popover |
| `shadow-lg` | `0 12px 32px rgba(15,23,42,0.16)` | Modal, Drawer |

## 5.6 Component Design

### Button
| 변형 | 배경 | 텍스트 | 보더 | 사용 예 |
|---|---|---|---|---|
| Primary | `primary-500`, hover `primary-600` | white | none | 저장, 등록, 확인 |
| Secondary | white | `gray-700` | `1px solid gray-200` | 취소, 보조 액션 |
| Ghost | transparent | `gray-700` | none, hover 시 `gray-100` 배경 | 테이블 행 액션, 아이콘 버튼 |
| Danger | `danger-500`, hover `danger-600`(#DC2626) | white | none | 삭제, 거부 |
| 크기 | sm(28px) / md(36px, 기본) / lg(44px) | — | — | 폼 밀도에 따라 선택 |
| 상태 | disabled(opacity 0.4, cursor not-allowed), loading(Spinner + 텍스트 유지) | — | — | — |

### Input
- 높이 36px(md), 패딩 `space-3` 12px, 보더 `1px solid gray-200`, focus 시 `2px solid primary-500` + `primary-50` 외곽 글로우
- 에러 상태: 보더 `danger-500` + 하단에 `text-small danger-500` 메시지
- 좌측 아이콘 슬롯(검색 Input 등), 우측 클리어 버튼 슬롯 지원

### Table
- 헤더: `gray-50` 배경, `text-small font-medium gray-500`, sticky top
- 행: 높이 48px, hover 시 `gray-50` 배경, 짝수/홀수 줄무늬 없음(미니멀 원칙)
- 셀 정렬: 텍스트 좌측, 숫자/금액 우측, 상태/액션 중앙
- 행 선택: 좌측 체크박스 컬럼, 선택 시 행 배경 `primary-50`
- 정렬 가능한 컬럼 헤더에 ↕ 아이콘, 빈 상태(Empty State)는 중앙 아이콘+설명 텍스트+CTA 버튼

### Modal
- 오버레이: `rgba(15,23,42,0.4)` + backdrop-blur 2px
- 컨테이너: `radius-lg`, `shadow-lg`, 기본 폭 480px(sm)/640px(md)/800px(lg)
- 구조: Header(타이틀 + 닫기 X) — Divider — Body(스크롤 가능, max-height 70vh) — Divider — Footer(우측 정렬 Secondary+Primary 버튼)

### Card
- 배경 white, `radius-md`, `shadow-sm`, 보더 `1px solid gray-200`(shadow와 중복 사용해 경계 명확화)
- 패딩 `space-4`~`space-6`, 헤더(타이틀 + 우측 액션 아이콘) / 바디 구조
- KPI Card 변형: 좌측 아이콘 원형 배경(semantic color의 100 톤), 우측 숫자(text-h1) + 라벨(text-small) + 전월대비 화살표(▲ success / ▼ danger)

### Tag
- 인라인 텍스트형, 배경 없이 `1px solid gray-200` 보더 + `radius-sm`, 거래처 등급/제품 분류 등 "메타데이터 라벨"에 사용
- 크기: 높이 22px, 패딩 좌우 8px, `text-caption`

### Badge
- 배경 채움형(semantic-100), 텍스트(semantic-500 계열 진한 톤), `radius-sm`(pill 형태인 `radius-full`도 상태 표시에 허용)
- 상태값 전용: 예) `DRAFT`=gray, `CONFIRMED`/`IN_PROGRESS`=info, `PAID`/`COMPLETED`=success, `DELAYED`/`REJECTED`=danger, `PENDING`=warning
- Tag와의 구분: Tag=속성 메타데이터(중립적), Badge=상태/판정 결과(의미 있는 색상 필수)

### 기타 핵심 컴포넌트
- **Drawer**: 우측에서 슬라이드, 폭 480px, 목록 화면에서 상세를 보여줄 때 페이지 전환 없이 사용(거래처관리 등)
- **Toast**: 우상단 등장, 4초 자동 소멸, success/danger/info 3종, 저장/삭제 등 비파괴적 피드백
- **Confirm Dialog**: 파괴적 액션(삭제, 상태 확정) 전 필수 확인, 위험 액션은 버튼이 Danger 색상
- **Skeleton**: 데이터 로딩 중 레이아웃 시프트 방지용 자리표시자, 모든 Table/Card 비동기 로딩에 일괄 적용
- **Chat Bubble(AI)**: 사용자 메시지는 우측 정렬 `primary-500` 배경/white 텍스트, AI 메시지는 좌측 정렬 white 배경/`gray-700` 텍스트 + `ai-accent` 아이콘, Source Card는 별도 회색 박스로 시각적 분리

## 5.7 다크 사이드바 / 라이트 콘텐츠 영역 원칙

- 사이드바(`gray-900`)는 항상 고정 폭, 콘텐츠 스크롤과 독립적으로 sticky
- 사이드바 내 활성 메뉴: 좌측 4px `primary-500` 인디케이터 바 + `gray-800` 배경
- 콘텐츠 영역은 어떤 경우에도 다크 모드로 전환되지 않음(엔터프라이즈 데이터 화면은 장시간 응시 시 라이트가 가독성에 유리하다는 원칙 채택) — 다크모드는 향후 로드맵으로만 고려
