import { create } from 'zustand';
import type { AuthUser, RoleName } from '@/types/auth';
import * as authApi from '@/lib/api/auth-api';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  /** 앱 부팅 시 httpOnly Refresh Token 쿠키로 세션 복원을 시도하는 동안 true */
  isInitializing: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  /** 회사 최초 가입 — Tenant 생성 + ADMIN 계정 발급 후 로그인과 동일하게 세션을 시작한다 */
  register: (companyName: string, bizRegNo: string, adminName: string, email: string, password: string) => Promise<void>;
  /** 초대 가입자의 최초 비밀번호 변경 포함 — 성공 시 user.mustChangePassword를 false로 반영 */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  /** 앱 부팅 시 1회 호출 — /auth/refresh로 세션 복원을 시도한다 */
  bootstrap: () => Promise<void>;
  setAccessToken: (token: string) => void;
  /** 백엔드 호출 없이 로컬 세션만 비운다 — apiClient의 401 처리에서 사용 */
  clearSession: () => void;
  /**
   * 역할별로 메뉴/화면이 바뀌는 것을 재로그인 없이 시연하기 위한 데모 전용 헬퍼.
   * 화면 표시용 role만 바꿀 뿐 실제 권한은 로그인 시 발급된 JWT에 종속되므로,
   * 백엔드가 거부하는 동작은 역할 전환 후에도 여전히 거부된다.
   */
  switchRole: (role: RoleName) => void;
  /** 내 프로필에서 연락처/이메일을 수정했을 때 헤더 등 다른 화면에 즉시 반영하기 위한 패치 */
  patchUser: (partial: Partial<Pick<AuthUser, 'email'>>) => void;
}

/**
 * /auth/refresh는 호출마다 Refresh Token을 회전시키므로, React StrictMode의
 * effect 2회 실행 등으로 bootstrap()이 중복 호출되면 같은 쿠키로 동시에 두 번
 * 요청하게 되어 재사용 탐지(docs/12.3)에 걸려 강제 로그아웃될 수 있다.
 * 모듈 스코프 Promise로 중복 호출을 같은 요청에 합류시켜 방지한다.
 */
let bootstrapPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitializing: true,

  login: async (email, password, rememberMe) => {
    const { accessToken, user } = await authApi.login(email, password, rememberMe);
    set({ user, accessToken, isAuthenticated: true });
  },

  register: async (companyName, bizRegNo, adminName, email, password) => {
    const { accessToken, user } = await authApi.register(companyName, bizRegNo, adminName, email, password);
    set({ user, accessToken, isAuthenticated: true });
  },

  changePassword: async (currentPassword, newPassword) => {
    await authApi.changePassword(currentPassword, newPassword);
    const current = get().user;
    if (current) set({ user: { ...current, mustChangePassword: false } });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      get().clearSession();
    }
  },

  bootstrap: () => {
    bootstrapPromise ??= (async () => {
      try {
        const accessToken = await authApi.refresh();
        set({ accessToken });
        const user = await authApi.me();
        set({ user, isAuthenticated: true });
      } catch {
        get().clearSession();
      } finally {
        set({ isInitializing: false });
      }
    })();
    return bootstrapPromise;
  },

  setAccessToken: (accessToken) => set({ accessToken }),

  clearSession: () => set({ user: null, accessToken: null, isAuthenticated: false }),

  switchRole: (role) => {
    const current = get().user;
    if (!current) return;
    set({ user: { ...current, role } });
  },

  patchUser: (partial) => {
    const current = get().user;
    if (!current) return;
    set({ user: { ...current, ...partial } });
  },
}));
