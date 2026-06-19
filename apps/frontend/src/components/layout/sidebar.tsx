import { SidebarContent } from '@/components/layout/sidebar-content';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

/**
 * 데스크톱 고정 사이드바. docs/05-design-system.md 5.7 — 항상 다크,
 * 콘텐츠 영역(라이트)과 독립적으로 스크롤된다. AppLayout의 flex row 안에서
 * 일반 flex 자식으로 배치되어 별도의 fixed 포지셔닝 계산이 필요 없다.
 */
function Sidebar() {
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();

  return (
    <aside
      className={cn(
        'hidden h-screen shrink-0 overflow-hidden transition-[width] duration-200 md:block',
        sidebarCollapsed ? 'w-16' : 'w-60',
      )}
    >
      <SidebarContent collapsed={sidebarCollapsed} onToggleCollapsed={toggleSidebarCollapsed} />
    </aside>
  );
}

export { Sidebar };
