import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  collapsed?: boolean;
}

function Logo({ className, collapsed = false }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2 overflow-hidden', className)}>
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
        E
      </div>
      {!collapsed && <span className="truncate text-[15px] font-semibold tracking-tight text-white">ERPilot</span>}
    </div>
  );
}

export { Logo };
