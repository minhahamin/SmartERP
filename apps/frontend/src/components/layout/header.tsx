import { useState } from 'react';
import { Bell, Megaphone, Menu, Search, LogOut, User as UserIcon, RefreshCw, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { ROLE_LABEL, type RoleName } from '@/types/auth';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/utils';

const ROLE_OPTIONS = Object.keys(ROLE_LABEL) as RoleName[];

function NotificationButton({ icon: Icon, count, label }: { icon: typeof Bell; count: number; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      <Icon className="size-[18px]" />
      {count > 0 && (
        <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
          {count}
        </span>
      )}
    </button>
  );
}

function Header() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const switchRole = useAuthStore((state) => state.switchRole);
  const setMobileSidebarOpen = useUIStore((state) => state.setMobileSidebarOpen);

  const handleLogout = () => {
    logout();
    navigate(ROUTES.login);
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-white px-4 md:px-6">
      <button
        type="button"
        aria-label="메뉴 열기"
        className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary md:hidden"
        onClick={() => setMobileSidebarOpen(true)}
      >
        <Menu className="size-[18px]" />
      </button>

      <div className="relative hidden max-w-xs flex-1 sm:block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="검색..."
          className="pl-8"
        />
      </div>

      <div className="flex-1 sm:hidden" />

      <div className="flex items-center gap-1">
        <NotificationButton icon={Bell} count={3} label="알림" />
        <NotificationButton icon={Megaphone} count={2} label="공지사항" />
      </div>

      <div className="h-5 w-px bg-border" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-secondary">
            <Avatar className="size-7">
              <AvatarFallback>{user?.name.slice(0, 1) ?? '?'}</AvatarFallback>
            </Avatar>
            <span className="hidden flex-col items-start leading-tight sm:flex">
              <span className="text-sm font-medium text-foreground">{user?.name ?? '게스트'}</span>
              <span className="text-xs text-muted-foreground">{user ? ROLE_LABEL[user.role] : ''}</span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
            <span className="text-sm font-medium text-foreground">{user?.name}</span>
            <span className="text-xs text-muted-foreground">{user?.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <UserIcon /> 내 프로필
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <RefreshCw /> 데모: 역할 전환
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {ROLE_OPTIONS.map((role) => (
                <DropdownMenuItem key={role} onSelect={() => switchRole(role)}>
                  <span className={cn('flex size-3.5 items-center justify-center', user?.role !== role && 'opacity-0')}>
                    <Check className="size-3.5" />
                  </span>
                  {ROLE_LABEL[role]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
            <LogOut /> 로그아웃
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

export { Header };
