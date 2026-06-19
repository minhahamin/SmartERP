import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth-store';
import { ROLE_LABEL, type RoleName } from '@/types/auth';
import { ROUTES } from '@/config/routes';

const DEMO_ROLES: RoleName[] = ['ADMIN', 'HR_MANAGER', 'SALES_MANAGER', 'EMPLOYEE'];

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? ROUTES.dashboard;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO(backend 연동): POST /auth/login 호출로 교체. 현재는 백엔드가 없어 ADMIN 데모 계정으로 로그인한다.
    login('ADMIN');
    navigate(redirectTo, { replace: true });
  };

  const handleDemoLogin = (role: RoleName) => {
    login(role);
    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-primary-active p-12 text-white lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-base font-bold">E</div>
          ERPilot
        </div>
        <div className="max-w-md">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">
            <Sparkles className="size-3.5 text-ai-accent" />
            AI 업무 도우미 탑재
          </p>
          <h1 className="text-3xl font-bold leading-tight">ERP에게 말로 물어보세요.</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            재고, 매출, 사내 규정까지 — AI 업무 도우미가 즉시 답합니다.
            메뉴를 외울 필요 없이 자연어 질문 하나로 원하는 데이터에 도달하세요.
          </p>
        </div>
        <p className="text-xs text-white/40">© 2026 ERPilot. AI 기반 ERP SaaS 플랫폼.</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col gap-1 lg:hidden">
            <div className="mb-2 flex items-center gap-2 text-lg font-semibold text-foreground">
              <div className="flex size-8 items-center justify-center rounded-md bg-primary text-base font-bold text-white">
                E
              </div>
              ERPilot
            </div>
          </div>

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

            <Button type="submit" size="lg" className="mt-1 w-full">
              로그인
            </Button>
          </form>

          <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            데모 계정으로 빠르게 체험하기
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {DEMO_ROLES.map((role) => (
              <Button key={role} type="button" variant="secondary" size="sm" onClick={() => handleDemoLogin(role)}>
                {ROLE_LABEL[role]}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export { LoginPage };
