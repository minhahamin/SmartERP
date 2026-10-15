import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthLayout } from '@/components/layout/auth-layout';
import { resetPassword } from '@/lib/api/auth-api';
import { ROUTES } from '@/config/routes';
import type { ApiError } from '@/lib/api/client';

const MIN_PASSWORD_LENGTH = 8;

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
      return;
    }
    if (password !== confirm) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await resetPassword(token, password);
      navigate(ROUTES.login, { replace: true });
    } catch (caught) {
      setError(
        axios.isAxiosError<ApiError>(caught)
          ? (caught.response?.data?.error?.message ?? '비밀번호를 재설정하지 못했습니다.')
          : '비밀번호를 재설정하지 못했습니다.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-xl font-semibold text-foreground">비밀번호 재설정</h2>

      {!token ? (
        <div className="mt-4 flex flex-col gap-3">
          <p className="text-sm text-destructive">재설정 링크가 올바르지 않습니다. 메일의 링크를 다시 확인해주세요.</p>
          <Link to={ROUTES.forgotPassword} className="text-sm font-medium text-primary hover:underline">
            재설정 링크 다시 받기
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">새 비밀번호를 입력하세요.</p>
          <form className="mt-6 flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-password" className="text-sm font-medium text-foreground">
                새 비밀번호
              </label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
                새 비밀번호 확인
              </label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              비밀번호 재설정
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}

export { ResetPasswordPage };
