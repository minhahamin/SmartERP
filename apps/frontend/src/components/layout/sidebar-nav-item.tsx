import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ROUTES } from '@/config/routes';
import type { NavItem } from '@/types/nav';

interface SidebarNavItemProps {
  item: NavItem;
  collapsed?: boolean;
  onNavigate?: () => void;
}

function SidebarNavItem({ item, collapsed = false, onNavigate }: SidebarNavItemProps) {
  const Icon = item.icon;
  const isDashboard = item.path === ROUTES.dashboard;

  const link = (
    <NavLink
      to={item.path}
      end={isDashboard}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
          collapsed && 'justify-center px-0 py-2.5',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
          item.accent === 'ai' && isActive && 'text-ai-accent',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-opacity',
              isActive && !collapsed ? 'opacity-100' : 'opacity-0',
            )}
          />
          <Icon className={cn('size-4 shrink-0', item.accent === 'ai' && (isActive ? 'text-ai-accent' : 'text-ai-accent/80'))} />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </>
      )}
    </NavLink>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export { SidebarNavItem };
