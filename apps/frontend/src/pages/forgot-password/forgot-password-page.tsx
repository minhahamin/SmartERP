import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthLayout } from '@/components/layout/auth-layout';
import { forgotPassword } from '@/lib/api/auth-api';
import { ROUTES } from '@/config/routes';
import type { ApiError } from '@/lib/api/client';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (caught) {
      setError(
        axios.isAxiosError<ApiError>(caught)
          ? (caught.response?.data?.error?.message ?? '요청에 실패했습니다.')
          : '요청에 실패했습니다.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="text-xl font-semibold text-foreground">비밀번호 찾기</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.
      </p>

      {sent ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-md border border-border bg-white p-6 text-center">
          <MailCheck className="size-8 text-primary" />
          <p className="text-sm text-foreground">
            입력하신 이메일로 계정이 있다면 재설정 링크를 보냈습니다.
            <br />
            링크는 15분 동안만 유효합니다.
          </p>
        </div>
      ) : (
        <form className="mt-6 flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
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
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            재설정 링크 받기
          </Button>
        </form>
      )}

      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link to={ROUTES.login} className="font-medium text-primary hover:underline">
          로그인으로 돌아가기
        </Link>
      </p>
    </AuthLayout>
  );
}

export { ForgotPasswordPage };
