import { Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/utils';

/**
 * 전 화면 공통 AI 어시스턴트 진입점. docs/06-wireframes.md 6.2의 우하단 플로팅 버튼.
 * AI 어시스턴트 페이지 자체에서는 중복 노출되지 않도록 숨긴다.
 */
function AiFab() {
  const { pathname } = useLocation();
  if (pathname === ROUTES.aiAssistant) return null;

  return (
    <Link
      to={ROUTES.aiAssistant}
      className={cn(
        'fixed right-6 bottom-6 z-40 inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium text-white shadow-lg',
        'bg-ai-accent transition-transform hover:scale-105 hover:brightness-110 active:scale-100',
      )}
    >
      <Sparkles className="size-4" />
      AI에게 물어보기
    </Link>
  );
}

export { AiFab };
