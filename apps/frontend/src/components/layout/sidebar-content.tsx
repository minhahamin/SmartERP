import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Logo } from '@/components/common/logo';
import { SidebarNavItem } from '@/components/layout/sidebar-nav-item';
import { Separator } from '@/components/ui/separator';
import { NAV_SECTIONS } from '@/config/nav';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

interface SidebarContentProps {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onNavigate?: () => void;
}

function SidebarContent({ collapsed = false, onToggleCollapsed, onNavigate }: SidebarContentProps) {
  const role = useAuthStore((state) => state.user?.role);

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.roles || (role && item.roles.includes(role))),
  })).filter((section) => section.items.length > 0);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn('flex h-14 shrink-0 items-center border-b border-sidebar-border px-4', collapsed && 'justify-center px-0')}>
        <Logo collapsed={collapsed} />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="flex flex-col gap-4">
          {visibleSections.map((section, index) => (
            <div key={section.title ?? index} className="flex flex-col gap-0.5">
              {section.title && !collapsed && (
                <p className="px-2.5 pb-1 text-[11px] font-semibold tracking-wide text-sidebar-muted-foreground uppercase">
                  {section.title}
                </p>
              )}
              {section.title && collapsed && <Separator className="my-1 bg-sidebar-border" />}
              {section.items.map((item) => (
                <SidebarNavItem key={item.path} item={item} collapsed={collapsed} onNavigate={onNavigate} />
              ))}
            </div>
          ))}
        </div>
      </nav>

      {onToggleCollapsed && (
        <div className="hidden shrink-0 border-t border-sidebar-border p-2 md:block">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              collapsed && 'justify-center px-0',
            )}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!collapsed && <span>접기</span>}
          </button>
        </div>
      )}
    </div>
  );
}

export { SidebarContent };
