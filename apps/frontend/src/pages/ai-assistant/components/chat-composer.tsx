import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const SUGGESTED_QUESTIONS = [
  '재고가 부족한 품목은?',
  '이번 달 매출 요약해줘',
  '신입사원 연차 규정 알려줘',
  '생산 지연 중인 작업은?',
  '내 근태 현황 알려줘',
];

interface ChatComposerProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

function ChatComposer({ onSend, disabled = false }: ChatComposerProps) {
  const [value, setValue] = useState('');

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex flex-col gap-2 border-t border-border p-3">
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTED_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            disabled={disabled}
            onClick={() => onSend(question)}
            className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {question}
          </button>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
          className="min-h-11 flex-1 resize-none"
          rows={1}
        />
        <Button type="submit" size="icon" disabled={disabled || !value.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}

export { ChatComposer };
