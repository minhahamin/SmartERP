import { apiClient, type ApiSuccess } from '@/lib/api/client';
import type { ChatMessage, ChatSession } from '@/pages/ai-assistant/api/types';

export async function listChatSessions(): Promise<ChatSession[]> {
  const { data } = await apiClient.get<ApiSuccess<ChatSession[]>>('/ai/sessions');
  return data.data;
}

export async function createChatSession(): Promise<ChatSession> {
  const { data } = await apiClient.post<ApiSuccess<ChatSession>>('/ai/sessions', {});
  return data.data;
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
