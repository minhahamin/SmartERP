import { Sparkles, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/pages/ai-assistant/api/types';
import { ActionProposalCard } from '@/pages/ai-assistant/components/action-proposal-card';

/** "toolA, toolB, toolC" → 실제로 몇 단계를 거쳐 조사했는지 순서대로 보여준다(멀티스텝 도구 호출 투명화) */
function ToolChain({ functionName, tokenUsage }: { functionName: string; tokenUsage: number | null }) {
  const steps = functionName.split(', ').filter(Boolean);
  const isAction = steps.some((s) => s.startsWith('draft'));

  return (
    <span className="flex flex-wrap items-center gap-1 px-1 text-[11px] text-muted-foreground">
      <Wrench className="size-3 shrink-0" />
      <span>{isAction ? '처리:' : '조회:'}</span>
      {steps.map((step, i) => (
        <span key={`${step}-${i}`} className="flex items-center gap-1">
          <span className="rounded bg-gray-100 px-1 py-0.5 font-mono">{step}</span>
          {i < steps.length - 1 && <span aria-hidden>→</span>}
        </span>
      ))}
      {tokenUsage != null && <span className="ml-1 text-muted-foreground/70">· {tokenUsage.toLocaleString()} tokens</span>}
    </span>
  );
}

function ChatMessageBubble({ message, sessionId }: { message: ChatMessage; sessionId: string }) {
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
          <ToolChain functionName={message.functionName} tokenUsage={message.tokenUsage} />
        )}
        {!isUser && message.actionDraft && <ActionProposalCard draft={message.actionDraft} sessionId={sessionId} />}
      </div>
    </div>
  );
}

export { ChatMessageBubble };
