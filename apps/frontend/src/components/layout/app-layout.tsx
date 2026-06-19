import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';
import { Header } from '@/components/layout/header';
import { AiFab } from '@/components/common/ai-fab';

/**
 * 인증된 사용자를 위한 공통 셸. docs/04-screen-design.md 4.0 공통 레이아웃 셸.
 * 다크 사이드바 + 라이트 콘텐츠 영역, 우하단 AI 어시스턴트 진입점을 모든 화면에서 공유한다.
 */
function AppLayout() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <MobileSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-[1200px]">
            <Outlet />
          </div>
        </main>
      </div>
      <AiFab />
    </div>
  );
}

export { AppLayout };
