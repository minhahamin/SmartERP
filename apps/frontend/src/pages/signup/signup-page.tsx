import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthLayout } from '@/components/layout/auth-layout';
import { useAuthStore } from '@/stores/auth-store';
import { ROUTES } from '@/config/routes';
import type { ApiError } from '@/lib/api/client';

/** docs/02-users-and-permissions.md 2.4 — 회사 최초 가입 시 자동으로 ADMIN 역할이 부여된다 */
function SignupPage() {
  const [companyName, setCompanyName] = useState('');
  const [bizRegNo, setBizRegNo] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const register = useAuthStore((state) => state.register);
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(companyName, bizRegNo, adminName, email, password);
      navigate(ROUTES.dashboard, { replace: true });
    } catch (caught) {
      const message = axios.isAxiosError<ApiError>(caught)
        ? caught.response?.data?.error?.message ?? '회원가입에 실패했습니다.'
        : '회원가입에 실패했습니다.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-xl font-semibold text-foreground">회원가입</h2>
      <p className="mt-1 text-sm text-muted-foreground">회사 워크스페이스를 새로 만들고 관리자로 시작하세요.</p>

      <form className="mt-6 flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="companyName" className="text-sm font-medium text-foreground">
            회사명
          </label>
          <Input
            id="companyName"
            placeholder="(주)ERPilot"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="bizRegNo" className="text-sm font-medium text-foreground">
            사업자등록번호
          </label>
          <Input
            id="bizRegNo"
            placeholder="123-45-67890"
            value={bizRegNo}
            onChange={(event) => setBizRegNo(event.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="adminName" className="text-sm font-medium text-foreground">
            관리자 이름
          </label>
          <Input
            id="adminName"
            placeholder="홍길동"
            value={adminName}
            onChange={(event) => setAdminName(event.target.value)}
            required
          />
        </div>

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
              placeholder="8자 이상"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
          <label htmlFor="passwordConfirm" className="text-sm font-medium text-foreground">
            비밀번호 확인
          </label>
          <Input
            id="passwordConfirm"
            type={showPassword ? 'text' : 'password'}
            placeholder="비밀번호를 한 번 더 입력하세요"
            value={passwordConfirm}
            onChange={(event) => setPasswordConfirm(event.target.value)}
            minLength={8}
            required
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" className="mt-1 w-full" disabled={isSubmitting}>
          회원가입
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        이미 계정이 있으신가요?{' '}
        <Link to={ROUTES.login} className="font-medium text-primary hover:underline">
          로그인
        </Link>
      </p>
    </AuthLayout>
  );
}

export { SignupPage };
