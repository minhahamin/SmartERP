import type { LeaveType } from '@/pages/profile/api/leave-api';

export type ChatRole = 'USER' | 'ASSISTANT';

export type AiActionStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'EXPIRED';

export interface LeaveRequestDraftPayload {
  type: LeaveType;
  startDate: string;
  endDate: string;
  timeSlot?: string;
  reason?: string;
}

export interface AnnouncementDraftPayload {
  title: string;
  content: string;
  category?: string;
  isPinned?: boolean;
}

export interface ProductionStatusUpdateDraftPayload {
  productionOrderId: string;
  orderNo: string;
  status: string;
  producedQty?: number;
}

export interface AiActionDraft {
  id: string;
  actionType: 'LEAVE_REQUEST' | 'ANNOUNCEMENT' | 'PRODUCTION_STATUS_UPDATE' | string;
  payload: LeaveRequestDraftPayload | AnnouncementDraftPayload | ProductionStatusUpdateDraftPayload | Record<string, unknown>;
  status: AiActionStatus;
  resultingRecordId: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  /** 이 답변을 만들기 위해 호출된 도구 이름(쉼표 구분). 도구 호출 없이 답한 경우 null */
  functionName: string | null;
  tokenUsage: number | null;
  /** AI가 "제안"까지만 한 액션(예: 휴가 신청)이 있으면 채워진다. 사용자가 확인/취소해야 최종 처리된다. */
  actionDraft: AiActionDraft | null;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string | null;
  createdAt: string;
}
