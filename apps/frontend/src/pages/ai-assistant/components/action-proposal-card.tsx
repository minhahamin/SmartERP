import { CalendarCheck, CalendarX, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LEAVE_TYPE_LABEL, type LeaveType } from '@/pages/profile/api/leave-api';
import { useConfirmAiAction, useRejectAiAction } from '@/pages/ai-assistant/hooks/use-ai-assistant';
import type { AiActionDraft, LeaveRequestDraftPayload } from '@/pages/ai-assistant/api/types';

/** AiActionDraft.actionType별 표시 방식을 여기에 하나씩 추가한다(현재는 LEAVE_REQUEST 1종) */
function renderPayload(draft: AiActionDraft): { title: string; rows: Array<[string, string]> } {
  if (draft.actionType === 'LEAVE_REQUEST') {
    const p = draft.payload as LeaveRequestDraftPayload;
    const period = p.startDate === p.endDate ? p.startDate : `${p.startDate} ~ ${p.endDate}`;
    const rows: Array<[string, string]> = [
      ['유형', LEAVE_TYPE_LABEL[p.type as LeaveType] ?? p.type],
      ['기간', period],
    ];
    if (p.timeSlot) rows.push(['시간', p.timeSlot]);
    if (p.reason) rows.push(['사유', p.reason]);
    return { title: '휴가 신청 초안', rows };
  }
  return { title: draft.actionType, rows: Object.entries(draft.payload).map(([k, v]) => [k, String(v)]) };
}

const STATUS_BADGE: Record<AiActionDraft['status'], { label: string; icon: typeof CheckCircle2; variant: 'success' | 'danger' | 'default' }> = {
  PENDING: { label: '확인 대기', icon: Clock, variant: 'default' },
  CONFIRMED: { label: '접수 완료', icon: CheckCircle2, variant: 'success' },
  REJECTED: { label: '취소됨', icon: XCircle, variant: 'danger' },
  EXPIRED: { label: '만료됨(다시 요청해주세요)', icon: XCircle, variant: 'danger' },
};

function ActionProposalCard({ draft, sessionId }: { draft: AiActionDraft; sessionId: string }) {
  const confirm = useConfirmAiAction(sessionId);
  const reject = useRejectAiAction(sessionId);
  const { title, rows } = renderPayload(draft);
  const status = STATUS_BADGE[draft.status];
  const StatusIcon = status.icon;
  const pending = draft.status === 'PENDING';

  return (
    <div className="w-full max-w-sm rounded-lg border border-ai-accent/30 bg-ai-accent/5 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <CalendarCheck className="size-3.5 text-ai-accent" /> {title}
        </span>
        <Badge variant={status.variant}>
          <StatusIcon className="size-3" /> {status.label}
        </Badge>
      </div>

      <dl className="mb-3 space-y-1 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <dt className="w-10 shrink-0 text-muted-foreground">{label}</dt>
            <dd className="text-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      {pending && (
        <div className="flex justify-end gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            loading={reject.isPending}
            disabled={confirm.isPending}
            onClick={() => reject.mutate(draft.id)}
          >
            <CalendarX className="size-3.5" /> 취소
          </Button>
          <Button variant="primary" size="sm" loading={confirm.isPending} disabled={reject.isPending} onClick={() => confirm.mutate(draft.id)}>
            <CheckCircle2 className="size-3.5" /> 확인하고 신청
          </Button>
        </div>
      )}
    </div>
  );
}

export { ActionProposalCard };
