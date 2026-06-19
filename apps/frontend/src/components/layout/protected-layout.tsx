import { Navigate, useLocation } from 'react-router-dom';
import { AppLayout } from '@/components/layout/app-layout';
import { useAuthStore } from '@/stores/auth-store';
import { ROUTES } from '@/config/routes';

/**
 * 인증 가드. docs/02-users-and-permissions.md 권한 매트릭스는 화면/API/AI 3중으로
 * 강제되는데, 이 컴포넌트는 그중 1차 방어선(화면 진입 차단)을 담당한다.
 */
function ProtectedLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  return <AppLayout />;
}

export { ProtectedLayout };
