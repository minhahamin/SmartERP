import { Sparkles, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/pages/ai-assistant/api/types';

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'USER';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('flex max-w-[85%] flex-col gap-1', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-lg px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-white text-foreground shadow-sm border border-border',
          )}
        >
          {!isUser && (
            <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-ai-accent">
              <Sparkles className="size-3" /> ERPilot AI
            </span>
          )}
          {message.content}
        </div>
        {!isUser && message.functionName && (
          <span className="flex items-center gap-1 px-1 text-[11px] text-muted-foreground">
            <Wrench className="size-3" /> 조회: {message.functionName}
          </span>
        )}
      </div>
    </div>
  );
}

export { ChatMessageBubble };
