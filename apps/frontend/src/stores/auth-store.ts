import { create } from 'zustand';
import type { AuthUser, RoleName } from '@/types/auth';
import { EMPLOYEES } from '@/mocks/employees';
import { DEPARTMENTS } from '@/mocks/departments';

/**
 * 백엔드가 준비되기 전까지 사용하는 데모 계정.
 * docs/02-users-and-permissions.md 2.1 페르소나 정의와 1:1로 매핑되며,
 * mocks/employees.ts의 실제 직원 레코드를 그대로 참조한다 — id가 어긋나면
 * 내 급여/내 통계/AI 챗봇의 본인 스코프 조회가 깨지므로 단일 소스를 유지한다.
 */
const DEMO_EMPLOYEE_ID: Record<RoleName, string> = {
  ADMIN: 'emp-1000', // 김도윤
  HR_MANAGER: 'emp-1042', // 최유진
  SALES_MANAGER: 'emp-1024', // 김민준
  EMPLOYEE: 'emp-1031', // 박지훈
};

function toAuthUser(role: RoleName): AuthUser {
  const employee = EMPLOYEES.find((e) => e.id === DEMO_EMPLOYEE_ID[role]);
  if (!employee) throw new Error(`데모 계정 매핑 오류: ${role}에 해당하는 직원을 찾을 수 없습니다.`);
  return {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    role,
    departmentName: DEPARTMENTS.find((d) => d.id === employee.departmentId)?.name ?? '-',
    position: employee.position,
  };
}

export const MOCK_USERS: Record<RoleName, AuthUser> = {
  ADMIN: toAuthUser('ADMIN'),
  HR_MANAGER: toAuthUser('HR_MANAGER'),
  SALES_MANAGER: toAuthUser('SALES_MANAGER'),
  EMPLOYEE: toAuthUser('EMPLOYEE'),
};

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (role: RoleName) => void;
  logout: () => void;
  /** 데모용 역할 전환 — RBAC에 따라 메뉴/화면이 바뀌는 것을 재로그인 없이 시연하기 위한 헬퍼 */
  switchRole: (role: RoleName) => void;
}

/**
 * Access Token은 새로고침 시 휘발되는 메모리 상태로만 보관한다(localStorage 미사용).
 * 근거: docs/12-jwt-auth-design.md 12.3 — XSS로 인한 토큰 탈취 범위를 최소화하기 위한 설계.
 * 실제 백엔드 연동 시에는 앱 부팅 시 httpOnly Refresh Token 쿠키로 /auth/refresh를 호출해
 * Access Token을 재발급받는 흐름으로 대체된다.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  login: (role) => {
    set({ user: MOCK_USERS[role], accessToken: `mock-access-token.${role}`, isAuthenticated: true });
  },

  logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),

  switchRole: (role) => {
    if (!get().user) return;
    set({ user: MOCK_USERS[role] });
  },
}));
