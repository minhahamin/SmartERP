import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useChatSessions, useCreateChatSession } from '@/pages/ai-assistant/hooks/use-ai-assistant';

interface ChatSidebarProps {
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
}

function ChatSidebar({ selectedSessionId, onSelectSession }: ChatSidebarProps) {
  const { data: sessions, isLoading } = useChatSessions();
  const createSession = useCreateChatSession();

  return (
    <div className="flex h-full flex-col gap-2 border-r border-border p-3">
      <Button
        size="sm"
        variant="secondary"
        className="w-full justify-center"
        loading={createSession.isPending}
        onClick={() => createSession.mutate(undefined, { onSuccess: (session) => onSelectSession(session.id) })}
      >
        <Plus /> 새 대화
      </Button>
      <div className="flex flex-col gap-0.5 overflow-y-auto">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8" />)
        ) : sessions && sessions.length > 0 ? (
          sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => onSelectSession(session.id)}
              className={cn(
                'truncate rounded-md px-2.5 py-2 text-left text-sm',
                selectedSessionId === session.id ? 'bg-primary-soft font-medium text-primary-soft-foreground' : 'text-foreground hover:bg-secondary',
              )}
            >
              {session.title ?? '새 대화'}
            </button>
          ))
        ) : (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">대화 내역이 없습니다.</p>
        )}
      </div>
    </div>
  );
}

export { ChatSidebar };
