import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatSidebar } from '@/pages/ai-assistant/components/chat-sidebar';
import { ChatMessageBubble } from '@/pages/ai-assistant/components/chat-message-bubble';
import { ChatComposer } from '@/pages/ai-assistant/components/chat-composer';
import { useChatMessages, useChatSessions, useSendChatMessage } from '@/pages/ai-assistant/hooks/use-ai-assistant';

function AiAssistantPage() {
  const { data: sessions, isLoading: sessionsLoading } = useChatSessions();
  // 사용자가 직접 고른 세션. 없거나(처음 진입/삭제 직후) 목록에서 사라졌으면(다른 곳에서 삭제됨) 가장 최근 세션을 보여준다.
  const [pickedSessionId, setPickedSessionId] = useState<string | null>(null);
  const pickedStillExists = pickedSessionId !== null && (sessions?.some((s) => s.id === pickedSessionId) ?? true);
  const selectedSessionId = (pickedStillExists ? pickedSessionId : null) ?? sessions?.[0]?.id ?? null;
  // 모바일(<md)에서는 대화 목록과 채팅을 한 화면에 나란히 둘 수 없어 둘 중 하나만 보여준다
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const setSelectedSessionId = (id: string | null) => {
    setPickedSessionId(id);
    setMobileListOpen(false);
  };
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading: messagesLoading } = useChatMessages(selectedSessionId ?? undefined);
  const sendMessage = useSendChatMessage(selectedSessionId ?? undefined);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sendMessage.isPending]);

  const handleSend = (content: string) => {
    if (!selectedSessionId) return;
    sendMessage.mutate(content);
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
          <Sparkles className="size-5 text-ai-accent" /> AI 업무 도우미
        </h1>
        <p className="text-sm text-muted-foreground">자연어로 ERP 데이터를 조회하거나 사내 문서를 검색합니다.</p>
      </div>

      <Card className="flex flex-1 overflow-hidden p-0">
        <div className={cn("shrink-0 md:block md:w-56", mobileListOpen ? "block w-full" : "hidden")}>
          <ChatSidebar
            selectedSessionId={selectedSessionId}
            onSelectSession={setSelectedSessionId}
            onSessionDeleted={(id) => {
              if (selectedSessionId === id) setSelectedSessionId(null);
            }}
          />
        </div>

        <div className={cn("min-w-0 flex-1 flex-col md:flex", mobileListOpen ? "hidden" : "flex")}>
          <button
            type="button"
            onClick={() => setMobileListOpen(true)}
            className="flex items-center gap-1 border-b border-border px-3 py-2 text-sm font-medium text-muted-foreground md:hidden"
          >
            <ChevronLeft className="size-4" /> 대화 목록
          </button>
          {!selectedSessionId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <Sparkles className="size-8 text-ai-accent" />
              <p className="text-sm">새 대화를 시작하거나 좌측에서 대화를 선택하세요.</p>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-50 p-4">
                {messagesLoading || !messages ? (
                  <div className="flex flex-col gap-3">
                    <Skeleton className="h-12 w-2/3" />
                    <Skeleton className="ml-auto h-10 w-1/2" />
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {messages.map((message) => (
                      <ChatMessageBubble key={message.id} message={message} sessionId={selectedSessionId} />
                    ))}
                    {sendMessage.isPending && (
                      <div className="flex justify-start">
                        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-muted-foreground shadow-sm">
                          <span className="flex gap-1">
                            <span className="size-1.5 animate-bounce rounded-full bg-ai-accent [animation-delay:-0.3s]" />
                            <span className="size-1.5 animate-bounce rounded-full bg-ai-accent [animation-delay:-0.15s]" />
                            <span className="size-1.5 animate-bounce rounded-full bg-ai-accent" />
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <ChatComposer onSend={handleSend} disabled={sendMessage.isPending} />
            </>
          )}
        </div>
      </Card>

      {sessionsLoading && <Skeleton className="h-10" />}
    </div>
  );
}

export { AiAssistantPage };
