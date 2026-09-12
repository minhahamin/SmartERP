import { apiClient, type ApiSuccess } from '@/lib/api/client';
import { triggerBlobDownload } from '@/lib/api/download';
import type { AiActionDraft, ChatMessage, ChatSession } from '@/pages/ai-assistant/api/types';

export async function listChatSessions(): Promise<ChatSession[]> {
  const { data } = await apiClient.get<ApiSuccess<ChatSession[]>>('/ai/sessions');
  return data.data;
}

export async function createChatSession(): Promise<ChatSession> {
  const { data } = await apiClient.post<ApiSuccess<ChatSession>>('/ai/sessions', {});
  return data.data;
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/ai/sessions/${sessionId}`);
}

export async function listChatMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data } = await apiClient.get<ApiSuccess<ChatMessage[]>>(`/ai/sessions/${sessionId}/messages`);
  return data.data;
}

/** Gemini Function Calling 루프가 서버에서 끝난 뒤 완성된 답변을 한 번에 반환한다(스트리밍 아님) */
export async function sendChatMessage(sessionId: string, content: string): Promise<ChatMessage> {
  const { data } = await apiClient.post<ApiSuccess<ChatMessage>>(`/ai/sessions/${sessionId}/messages`, { content });
  return data.data;
}

/** AI가 제안한 액션 초안을 확정 실행한다 — 이때 비로소 실제 LeaveRequest 등이 생성된다 */
export async function confirmAiAction(draftId: string): Promise<AiActionDraft> {
  const { data } = await apiClient.post<ApiSuccess<AiActionDraft>>(`/ai/actions/${draftId}/confirm`);
  return data.data;
}

export async function rejectAiAction(draftId: string): Promise<AiActionDraft> {
  const { data } = await apiClient.post<ApiSuccess<AiActionDraft>>(`/ai/actions/${draftId}/reject`);
  return data.data;
}

/** 공지/휴가 초안을 상태와 무관하게 PDF로 내려받는다(제안 단계여도 미리보기 용도로 가능) */
export async function exportAiActionPdf(draftId: string): Promise<void> {
  const { data } = await apiClient.get(`/ai/actions/${draftId}/pdf`, { responseType: 'blob' });
  triggerBlobDownload(data as Blob, `ai-action-${draftId}.pdf`);
}
