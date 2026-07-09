import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { cn } from '@/lib/utils';
import { useChatSessions, useCreateChatSession, useDeleteChatSession } from '@/pages/ai-assistant/hooks/use-ai-assistant';
import type { ChatSession } from '@/pages/ai-assistant/api/types';

interface ChatSidebarProps {
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
  onSessionDeleted: (id: string) => void;
}

function ChatSidebar({ selectedSessionId, onSelectSession, onSessionDeleted }: ChatSidebarProps) {
  const { data: sessions, isLoading } = useChatSessions();
  const createSession = useCreateChatSession();
  const deleteSession = useDeleteChatSession();
  const [deleteTarget, setDeleteTarget] = useState<ChatSession | null>(null);

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
            <div
              key={session.id}
              className={cn(
                'group flex items-center rounded-md pr-1',
                selectedSessionId === session.id ? 'bg-primary-soft' : 'hover:bg-secondary',
              )}
            >
              <button
                type="button"
                onClick={() => onSelectSession(session.id)}
                className={cn(
                  'min-w-0 flex-1 truncate px-2.5 py-2 text-left text-sm',
                  selectedSessionId === session.id ? 'font-medium text-primary-soft-foreground' : 'text-foreground',
                )}
              >
                {session.title ?? '새 대화'}
              </button>
              <button
                type="button"
                aria-label="대화 삭제"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(session);
                }}
                className="hidden size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-destructive group-hover:flex"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))
        ) : (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">대화 내역이 없습니다.</p>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`'${deleteTarget?.title ?? '새 대화'}' 대화를 삭제할까요?`}
        description="삭제된 대화는 복구할 수 없습니다."
        confirmLabel="삭제"
        variant="danger"
        loading={deleteSession.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteSession.mutate(deleteTarget.id, {
            onSuccess: () => {
              onSessionDeleted(deleteTarget.id);
              setDeleteTarget(null);
            },
          });
        }}
      />
    </div>
  );
}

export { ChatSidebar };
