import { useState, type FormEvent } from 'react';
import { CheckCircle2, Plus, Sparkles, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tag } from '@/components/ui/tag';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useAuthStore } from '@/stores/auth-store';
import { hasPermission } from '@/lib/permissions';
import {
  useCreateFaqDraft,
  useGenerateFaqCandidates,
  usePendingFaq,
  usePublishFaq,
  usePublishedFaq,
  useRejectFaq,
} from '@/pages/faq/hooks/use-faq';
import type { FaqItem } from '@/pages/faq/api/faq-api';

const SOURCE_LABEL: Record<FaqItem['sourceType'], { label: string; variant: 'info' | 'default' }> = {
  AI_GENERATED: { label: 'AI 자동 생성', variant: 'info' },
  MANUAL: { label: '수동 작성', variant: 'default' },
};

function FaqPage() {
  const { data: pending, isLoading: pendingLoading } = usePendingFaq();
  const { data: published, isLoading: publishedLoading } = usePublishedFaq();
  const generate = useGenerateFaqCandidates();
  const publish = usePublishFaq();
  const reject = useRejectFaq();
  const [createOpen, setCreateOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<FaqItem | null>(null);
  // 생성(DOCUMENT:CREATE)과 게시/반려(DOCUMENT:UPDATE)는 별도 권한이라, UPDATE가 없는 사용자에게는
  // 어차피 403이 날 버튼을 보여주지 않는다(ai-tools.service.ts의 draftProductionStatusUpdate와 같은 원칙).
  const permissions = useAuthStore((state) => state.user?.permissions);
  const canModerate = hasPermission(permissions, 'DOCUMENT', 'UPDATE');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="FAQ 관리"
        description="반복되는 질문을 FAQ로 정리합니다. 자동 생성된 후보와 수동 작성 초안은 게시 전 검수를 거칩니다."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" loading={generate.isPending} onClick={() => generate.mutate(undefined)}>
              <Sparkles /> 자동 생성 실행
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus /> 직접 추가
            </Button>
          </div>
        }
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">검수 대기 {pending ? `(${pending.length})` : ''}</h2>
        {pendingLoading || !pending ? (
          <Skeleton className="h-32" />
        ) : pending.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">검수 대기 중인 FAQ가 없습니다.</Card>
        ) : (
          <div className="flex flex-col gap-2">
            {pending.map((item) => (
              <Card key={item.id} className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={SOURCE_LABEL[item.sourceType].variant}>{SOURCE_LABEL[item.sourceType].label}</Badge>
                      {item.category && <Tag>{item.category}</Tag>}
                    </div>
                    <p className="text-sm font-medium text-foreground">{item.question}</p>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.answer}</p>
                  </div>
                  {canModerate && (
                    <div className="flex shrink-0 gap-1.5">
                      <Button variant="secondary" size="sm" onClick={() => setRejectTarget(item)}>
                        <XCircle className="size-3.5" /> 반려
                      </Button>
                      <Button size="sm" loading={publish.isPending} onClick={() => publish.mutate(item.id)}>
                        <CheckCircle2 className="size-3.5" /> 게시
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">게시됨 {published ? `(${published.length})` : ''}</h2>
        {publishedLoading || !published ? (
          <Skeleton className="h-32" />
        ) : published.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">게시된 FAQ가 없습니다.</Card>
        ) : (
          <Card className="overflow-hidden p-0">
            {published.map((item) => (
              <div key={item.id} className="flex flex-col gap-1 border-b border-border p-4 last:border-0">
                <div className="flex items-center gap-2">
                  {item.category && <Tag>{item.category}</Tag>}
                  <span className="text-xs text-muted-foreground">조회 {item.hitCount}회</span>
                </div>
                <p className="text-sm font-medium text-foreground">{item.question}</p>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </Card>
        )}
      </section>

      <CreateFaqDialog open={createOpen} onOpenChange={setCreateOpen} />

      <ConfirmDialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        title="이 FAQ 후보를 반려할까요?"
        description="반려하면 해당 후보는 삭제되며 되돌릴 수 없습니다."
        confirmLabel="반려"
        variant="danger"
        loading={reject.isPending}
        onConfirm={() => {
          if (!rejectTarget) return;
          reject.mutate(rejectTarget.id, { onSuccess: () => setRejectTarget(null) });
        }}
      />
    </div>
  );
}

function CreateFaqDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [form, setForm] = useState({ question: '', answer: '', category: '' });
  const create = useCreateFaqDraft();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate(
      { question: form.question, answer: form.answer, category: form.category || undefined },
      {
        onSuccess: () => {
          onOpenChange(false);
          setForm({ question: '', answer: '', category: '' });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>FAQ 직접 추가</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="faq-question">질문</Label>
              <Input id="faq-question" required value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="faq-answer">답변</Label>
              <Textarea id="faq-answer" required rows={4} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="faq-category">분류(선택)</Label>
              <Input id="faq-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" loading={create.isPending}>
              추가(검수 대기로 등록)
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { FaqPage };
