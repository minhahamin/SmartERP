# ERPilot Frontend

ERPilot AI ERP SaaS의 React 프론트엔드. 설계 근거는 [docs/](../../docs)의 04(화면 설계), 05(디자인 시스템), 06(와이어프레임) 문서를 따른다.

## 기술 스택

React 19 · TypeScript · Vite · React Router 7 · React Query 5 · Zustand 5 · Tailwind CSS 4 · shadcn/ui(Radix) · Recharts

## 시작하기

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build
npm run lint
```

### ⚠️ Node.js 버전 요구사항

Vite 8 / rolldown은 **Node `^20.19.0` 또는 `>=22.12.0`** 을 요구한다. 더 낮은 버전(예: 20.16.x)에서는
npm의 알려진 버그([npm/cli#4828](https://github.com/npm/cli/issues/4828))로 인해 `npm install` 시
플랫폼별 rolldown 네이티브 바인딩(`@rolldown/binding-*`)이 설치되지 않아 `npm run dev`/`build`가
`Cannot find native binding` 오류로 실패할 수 있다.

- **권장 해결책**: Node를 `20.19+` 또는 `22.12+`로 업그레이드한다.
- **임시 우회**: 현재 OS에 맞는 바인딩을 직접 설치한다.
  ```bash
  npm install @rolldown/binding-win32-x64-msvc@1.0.3 --no-save   # Windows x64
  # macOS Apple Silicon: @rolldown/binding-darwin-arm64
  # macOS Intel:         @rolldown/binding-darwin-x64
  # Linux x64:           @rolldown/binding-linux-x64-gnu
  ```
  `package.json`의 `optionalDependencies`에 주요 플랫폼 바인딩을 미리 선언해 두었지만, 위 버그 때문에
  `npm install` 한 번으로 항상 해결되지는 않는다 — 위 명령으로 해당 패키지를 직접 설치하면 즉시 해결된다.

## 폴더 구조

```
src/
├─ app/            (예약 — 앱 전역 초기화 로직 추가 시 사용)
├─ components/
│  ├─ ui/          shadcn/ui 프리미티브 (button, card, input, badge, dropdown-menu ...)
│  ├─ common/       여러 페이지가 공유하는 합성 컴포넌트 (PageHeader, StatCard, EmptyState, AiFab, Logo)
│  └─ layout/       Sidebar, Header, AppLayout, ProtectedLayout
├─ pages/           라우트 단위 페이지. 기능이 커지면 페이지 폴더 안에 api/ hooks/ components/ 를 둔다(예: pages/dashboard)
├─ router/          React Router 라우트 트리 정의
├─ stores/          Zustand 전역 상태 (auth-store, ui-store)
├─ lib/             axios 클라이언트, React Query 클라이언트, cn() 유틸
├─ config/          라우트 경로 상수, 사이드바 내비게이션 구성
└─ types/           전역 타입 (auth, nav)
```

설계 원칙: 페이지별 데이터 로직(`api/`, `hooks/`)은 해당 페이지 폴더 안에 colocate하고, 두 개 이상 페이지가 공유하는 것만 `lib/`, `stores/`, `components/common`으로 끌어올린다.

## 인증/권한 (현재 상태)

백엔드(NestJS) 연동 전까지 `stores/auth-store.ts`가 4개 역할(ADMIN/HR_MANAGER/SALES_MANAGER/EMPLOYEE)의
데모 계정을 제공한다. 로그인 화면 하단의 "데모 계정으로 빠르게 체험하기" 버튼이나 헤더 우측 사용자
메뉴의 "데모: 역할 전환"으로 역할별 사이드바/권한 변화를 즉시 확인할 수 있다.

Access Token은 새로고침 시 휘발되는 메모리 상태로만 보관한다(`localStorage` 미사용) — 근거는
[docs/12-jwt-auth-design.md](../../docs/12-jwt-auth-design.md) 12.3.
