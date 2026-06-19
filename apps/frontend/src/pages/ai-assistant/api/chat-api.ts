import { generateAssistantReply, type AssistantContext } from '@/pages/ai-assistant/api/ai-engine';
import type { ChatMessage, ChatSession } from '@/pages/ai-assistant/api/types';
import { delay } from '@/mocks/delay';

let sessionDb: ChatSession[] = [];
let messageDb: ChatMessage[] = [];
let seq = 0;
function nextId(prefix: string) {
  seq += 1;
  return `${prefix}-${seq}`;
}

function seedConversation(userId: string, title: string, question: string, ctx: AssistantContext) {
  const session: ChatSession = { id: nextId('session'), userId, title, createdAt: '2026-06-19T09:00:00' };
  sessionDb = [...sessionDb, session];
  const userMessage: ChatMessage = {
    id: nextId('msg'),
    sessionId: session.id,
    role: 'user',
    content: question,
    sourceType: 'none',
    createdAt: session.createdAt,
  };
  const reply = generateAssistantReply(question, ctx);
  const assistantMessage: ChatMessage = {
    id: nextId('msg'),
    sessionId: session.id,
    role: 'assistant',
    createdAt: session.createdAt,
    ...reply,
  };
  messageDb = [...messageDb, userMessage, assistantMessage];
}

// 영업담당자(emp-1024) 데모 계정에 docs/06-wireframes.md 6.7과 동일한 시드 대화를 미리 채워둔다.
seedConversation('emp-1024', '재고 100개 이하 품목', '현재 재고가 100개 이하인 품목 알려줘', { role: 'SALES_MANAGER', userId: 'emp-1024' });
seedConversation('emp-1024', '이번 달 매출 요약', '이번 달 매출 요약해줘', { role: 'SALES_MANAGER', userId: 'emp-1024' });
seedConversation('emp-1024', '연차 규정 문의', '신입사원 연차 규정 알려줘', { role: 'SALES_MANAGER', userId: 'emp-1024' });

export async function listChatSessions(userId: string): Promise<ChatSession[]> {
  await delay(200);
  return sessionDb.filter((s) => s.userId === userId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function listChatMessages(sessionId: string): Promise<ChatMessage[]> {
  await delay(150);
  return messageDb.filter((m) => m.sessionId === sessionId);
}

export async function createChatSession(userId: string): Promise<ChatSession> {
  await delay(150);
  const session: ChatSession = { id: nextId('session'), userId, title: '새 대화', createdAt: new Date().toISOString() };
  sessionDb = [session, ...sessionDb];
  return session;
}

export async function sendChatMessage(sessionId: string, content: string, ctx: AssistantContext): Promise<ChatMessage> {
  const userMessage: ChatMessage = {
    id: nextId('msg'),
    sessionId,
    role: 'user',
    content,
    sourceType: 'none',
    createdAt: new Date().toISOString(),
  };
  messageDb = [...messageDb, userMessage];

  const isFirstMessage = messageDb.filter((m) => m.sessionId === sessionId).length === 1;
  if (isFirstMessage) {
    sessionDb = sessionDb.map((s) => (s.id === sessionId ? { ...s, title: content.slice(0, 24) } : s));
  }

  await delay(700); // LLM 응답 지연 모사
  const reply = generateAssistantReply(content, ctx);
  const assistantMessage: ChatMessage = { id: nextId('msg'), sessionId, role: 'assistant', createdAt: new Date().toISOString(), ...reply };
  messageDb = [...messageDb, assistantMessage];
  return assistantMessage;
}
