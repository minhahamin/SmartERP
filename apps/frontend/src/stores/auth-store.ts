import { create } from 'zustand';
import type { AuthUser, RoleName } from '@/types/auth';

/**
 * 백엔드가 준비되기 전까지 사용하는 데모 계정.
 * docs/02-users-and-permissions.md 2.1 페르소나 정의와 1:1로 매핑된다.
 */
export const MOCK_USERS: Record<RoleName, AuthUser> = {
  ADMIN: {
    id: 'u-admin',
    name: '김도윤',
    email: 'admin@erpilot.io',
    role: 'ADMIN',
    departmentName: '경영지원팀',
    position: '대표',
  },
  HR_MANAGER: {
    id: 'u-hr',
    name: '최유진',
    email: 'hr@erpilot.io',
    role: 'HR_MANAGER',
    departmentName: '인사팀',
    position: '과장',
  },
  SALES_MANAGER: {
    id: 'u-sales',
    name: '김민준',
    email: 'sales@erpilot.io',
    role: 'SALES_MANAGER',
    departmentName: '영업1팀',
    position: '팀장',
  },
  EMPLOYEE: {
    id: 'u-emp',
    name: '박지훈',
    email: 'employee@erpilot.io',
    role: 'EMPLOYEE',
    departmentName: '생산1팀',
    position: '사원',
  },
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
