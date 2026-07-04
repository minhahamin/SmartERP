import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Menu, Search, LogOut, User as UserIcon, RefreshCw, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
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
import { NotificationsPopover } from '@/components/layout/notifications-popover';
import { AnnouncementsPopover } from '@/components/layout/announcements-popover';
import { searchGlobal, type SearchResultType } from '@/components/layout/search-api';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { ROLE_LABEL, type RoleName } from '@/types/auth';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/utils';

const ROLE_OPTIONS = Object.keys(ROLE_LABEL) as RoleName[];

const SEARCH_TYPE_LABEL: Record<SearchResultType, string> = {
  product: '제품',
  partner: '거래처',
  employee: '직원',
  document: '문서',
  announcement: '공지사항',
  production: '생산 오더',
  warehouse: '창고',
};

function Header() {
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const switchRole = useAuthStore((state) => state.switchRole);
  const setMobileSidebarOpen = useUIStore((state) => state.setMobileSidebarOpen);

  const trimmedSearch = search.trim();
  const { data: searchResults, isFetching: searchLoading } = useQuery({
    queryKey: ['global-search', trimmedSearch],
    queryFn: () => searchGlobal(trimmedSearch),
    enabled: trimmedSearch.length > 0,
  });

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.login);
  };

  const goToResult = (path: string) => {
    setSearchOpen(false);
    setSearch('');
    navigate(path);
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

      <Popover open={searchOpen && trimmedSearch.length > 0} onOpenChange={setSearchOpen}>
        <PopoverAnchor asChild>
          <div className="relative hidden max-w-xs flex-1 sm:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setSearchOpen(false);
              }}
              placeholder="전체 검색..."
              className="pl-8"
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          className="w-96 max-h-96 overflow-y-auto p-0"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          {searchLoading ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">검색 중...</p>
          ) : !searchResults || searchResults.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">'{trimmedSearch}'에 대한 검색 결과가 없습니다.</p>
          ) : (
            <div className="flex flex-col py-1.5">
              {searchResults.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  type="button"
                  onClick={() => goToResult(result.path)}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-secondary"
                >
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">{result.title}</span>
                  {result.subtitle && <span className="shrink-0 truncate text-xs text-muted-foreground">{result.subtitle}</span>}
                  <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    {SEARCH_TYPE_LABEL[result.type]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>

      <div className="flex-1 sm:hidden" />

      <div className="flex items-center gap-1">
        <NotificationsPopover />
        <AnnouncementsPopover />
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
          <DropdownMenuItem onSelect={() => navigate(ROUTES.profile)}>
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
