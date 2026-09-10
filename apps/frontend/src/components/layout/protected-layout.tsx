import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/app-layout';
import { useAuthStore } from '@/stores/auth-store';
import { ROUTES } from '@/config/routes';
import type { RoleName } from '@/types/auth';

/**
 * 인증 가드. docs/02-users-and-permissions.md 권한 매트릭스는 화면/API/AI 3중으로
 * 강제되는데, 이 컴포넌트는 그중 1차 방어선(화면 진입 차단)을 담당한다.
 */
function ProtectedLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const mustChangePassword = useAuthStore((state) => state.user?.mustChangePassword);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  if (mustChangePassword) {
    return <Navigate to={ROUTES.changePassword} replace />;
  }

  return <AppLayout />;
}

/** 역할 기반 1차 가드 — 사이드바 숨김과 별개로 URL 직접 접근을 차단한다 */
function RequireRole({ roles, children }: { roles: RoleName[]; children?: React.ReactNode }) {
  const role = useAuthStore((state) => state.user?.role);
  if (role && !roles.includes(role)) {
    return (
      <div style={{ padding: 32, maxWidth: 560, margin: '40px auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>접근 권한이 없습니다 (403)</h1>
        <p style={{ color: '#666' }}>이 화면은 {roles.join(', ')} 역할만 접근할 수 있습니다.</p>
      </div>
    );
  }
  return <>{children ?? <Outlet />}</>;
}

export { ProtectedLayout, RequireRole };
