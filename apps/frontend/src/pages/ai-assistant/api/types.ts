export type ChatRole = 'USER' | 'ASSISTANT';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  /** 이 답변을 만들기 위해 호출된 도구 이름(쉼표 구분). 도구 호출 없이 답한 경우 null */
  functionName: string | null;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string | null;
  createdAt: string;
}
