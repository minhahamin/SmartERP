import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthLayout } from '@/components/layout/auth-layout';
import { useAuthStore } from '@/stores/auth-store';
import { ROLE_LABEL, type RoleName } from '@/types/auth';
import { ROUTES } from '@/config/routes';
import type { ApiError } from '@/lib/api/client';

/** prisma/seed.ts의 데모 계정과 1:1로 맞춘 값 — 데모 환경 전용이며 운영 환경에는 적용되지 않는다 */
const DEMO_ACCOUNTS: Record<RoleName, string> = {
  ADMIN: 'doyoon.kim@erpilot.io',
  HR_MANAGER: 'yujin.choi@erpilot.io',
  SALES_MANAGER: 'minjun.kim@erpilot.io',
  EMPLOYEE: 'jihoon.park@erpilot.io',
};
const DEMO_PASSWORD = 'erpilot1234!';
const DEMO_ROLES: RoleName[] = ['ADMIN', 'HR_MANAGER', 'SALES_MANAGER', 'EMPLOYEE'];

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? ROUTES.dashboard;

  const performLogin = async (loginEmail: string, loginPassword: string) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(loginEmail, loginPassword, keepSignedIn);
      navigate(redirectTo, { replace: true });
    } catch (caught) {
      const message = axios.isAxiosError<ApiError>(caught)
        ? caught.response?.data?.error?.message ?? '로그인에 실패했습니다.'
        : '로그인에 실패했습니다.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void performLogin(email, password);
  };

  const handleDemoLogin = (role: RoleName) => {
    void performLogin(DEMO_ACCOUNTS[role], DEMO_PASSWORD);
  };

  return (
    <AuthLayout>
      <h2 className="text-xl font-semibold text-foreground">로그인</h2>
      <p className="mt-1 text-sm text-muted-foreground">업무용 계정으로 ERPilot에 접속하세요.</p>

      <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            이메일
          </label>
          <Input
            id="email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            비밀번호
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="pr-9"
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

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={keepSignedIn}
              onChange={(event) => setKeepSignedIn(event.target.checked)}
              className="size-3.5 rounded border-border accent-pink-500"
            />
            로그인 유지
          </label>
          <a href="#" className="font-medium text-primary hover:underline">
            비밀번호 찾기
          </a>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" className="mt-1 w-full" disabled={isSubmitting}>
          로그인
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        계정이 없으신가요?{' '}
        <Link to={ROUTES.signup} className="font-medium text-primary hover:underline">
          회원가입
        </Link>
      </p>

      <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        데모 계정으로 빠르게 체험하기
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {DEMO_ROLES.map((role) => (
          <Button
            key={role}
            type="button"
            variant="secondary"
            size="sm"
            disabled={isSubmitting}
            onClick={() => handleDemoLogin(role)}
          >
            {ROLE_LABEL[role]}
          </Button>
        ))}
      </div>
    </AuthLayout>
  );
}

export { LoginPage };
