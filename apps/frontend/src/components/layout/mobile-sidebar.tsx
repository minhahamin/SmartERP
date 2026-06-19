import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { SidebarContent } from '@/components/layout/sidebar-content';
import { useUIStore } from '@/stores/ui-store';

/**
 * 모바일/태블릿 폭에서 햄버거 버튼으로 열리는 사이드바 드로어.
 * 데스크톱 Sidebar와 동일한 SidebarContent를 재사용해 메뉴 구조가 어긋나지 않도록 한다.
 */
function MobileSidebar() {
  const { mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();

  return (
    <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
      <SheetContent side="left" className="w-60 max-w-[80%] gap-0 p-0 [&>button]:text-white">
        <SheetTitle className="sr-only">메뉴</SheetTitle>
        <SidebarContent onNavigate={() => setMobileSidebarOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

export { MobileSidebar };
