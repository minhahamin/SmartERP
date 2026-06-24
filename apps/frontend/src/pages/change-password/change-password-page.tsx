import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthLayout } from '@/components/layout/auth-layout';
import { useAuthStore } from '@/stores/auth-store';
import { ROUTES } from '@/config/routes';
import type { ApiError } from '@/lib/api/client';

/** docs/02-users-and-permissions.md 2.4 — 초대 가입자가 임시 비밀번호로 로그인한 직후 강제 진입하는 화면 */
function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const changePassword = useAuthStore((state) => state.changePassword);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (newPassword !== newPasswordConfirm) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      navigate(ROUTES.dashboard, { replace: true });
    } catch (caught) {
      const message = axios.isAxiosError<ApiError>(caught)
        ? caught.response?.data?.error?.message ?? '비밀번호 변경에 실패했습니다.'
        : '비밀번호 변경에 실패했습니다.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.login);
  };

  return (
    <AuthLayout>
      <h2 className="text-xl font-semibold text-foreground">비밀번호 변경</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        초대받은 임시 비밀번호로 로그인하셨습니다. 계속하려면 새 비밀번호를 설정해 주세요.
      </p>

      <form className="mt-6 flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="currentPassword" className="text-sm font-medium text-foreground">
            현재(임시) 비밀번호
          </label>
          <Input
            id="currentPassword"
            type={showPassword ? 'text' : 'password'}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="newPassword" className="text-sm font-medium text-foreground">
            새 비밀번호
          </label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="8자 이상"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="pr-9"
              minLength={8}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="newPasswordConfirm" className="text-sm font-medium text-foreground">
            새 비밀번호 확인
          </label>
          <Input
            id="newPasswordConfirm"
            type={showPassword ? 'text' : 'password'}
            value={newPasswordConfirm}
            onChange={(event) => setNewPasswordConfirm(event.target.value)}
            minLength={8}
            required
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" className="mt-1 w-full" disabled={isSubmitting}>
          비밀번호 변경
        </Button>
      </form>

      <button
        type="button"
        onClick={() => void handleLogout()}
        className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        다른 계정으로 로그인
      </button>
    </AuthLayout>
  );
}

export { ChangePasswordPage };
