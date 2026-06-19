export interface TableCardData {
  columns: string[];
  rows: (string | number)[][];
  conditionText: string;
  linkLabel?: string;
  linkTo?: string;
}

export interface CitationCardData {
  documentTitle: string;
  page?: string;
}

export type MessageSourceType = 'data' | 'document' | 'denied' | 'none';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  sourceType: MessageSourceType;
  tableData?: TableCardData;
  citation?: CitationCardData;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
}
