import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataTableCard, CitationCard, DeniedNotice } from '@/pages/ai-assistant/components/source-card';
import type { ChatMessage } from '@/pages/ai-assistant/api/types';

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('flex max-w-[85%] flex-col gap-1', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-lg px-3.5 py-2.5 text-sm leading-relaxed',
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
        {message.tableData && <DataTableCard data={message.tableData} />}
        {message.citation && <CitationCard citation={message.citation} />}
        {message.sourceType === 'denied' && <DeniedNotice />}
      </div>
    </div>
  );
}

export { ChatMessageBubble };
