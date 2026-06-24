import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
}

/** 로그인/회원가입/비밀번호 변경 등 인증 관련 공개 페이지가 공유하는 좌측 브랜드 패널 + 우측 폼 셸 */
function AuthLayout({ children }: AuthLayoutProps) {
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
          {children}
        </div>
      </div>
    </div>
  );
}

export { AuthLayout };
