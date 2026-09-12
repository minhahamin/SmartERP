import { apiClient, type ApiSuccess } from '@/lib/api/client';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  hitCount: number;
  sourceType: 'AI_GENERATED' | 'MANUAL';
  isPublished: boolean;
  createdAt: string;
}

export async function listPublishedFaq(): Promise<FaqItem[]> {
  const { data } = await apiClient.get<ApiSuccess<FaqItem[]>>('/ai/faq');
  return data.data;
}

/** 자동 생성 후보 + 사람이 만든 미게시 초안 */
export async function listPendingFaq(): Promise<FaqItem[]> {
  const { data } = await apiClient.get<ApiSuccess<FaqItem[]>>('/ai/faq/pending');
  return data.data;
}

export interface GenerateFaqResult {
  analyzedMessages: number;
  distinctQuestions: number;
  candidatesCreated: number;
  candidates: { id: string; question: string }[];
}

/** 최근 챗봇 질문 로그를 분석해 반복 질문을 FAQ 후보로 묶는다(임계치 미만이면 candidatesCreated: 0) */
export async function generateFaqCandidates(threshold?: number): Promise<GenerateFaqResult> {
  const { data } = await apiClient.post<ApiSuccess<GenerateFaqResult>>('/ai/faq/generate', { threshold });
  return data.data;
}

export interface CreateFaqInput {
  question: string;
  answer: string;
  category?: string;
}

export async function createFaqDraft(input: CreateFaqInput): Promise<FaqItem> {
  const { data } = await apiClient.post<ApiSuccess<FaqItem>>('/ai/faq', input);
  return data.data;
}

export async function publishFaq(id: string): Promise<FaqItem> {
  const { data } = await apiClient.post<ApiSuccess<FaqItem>>(`/ai/faq/${id}/publish`);
  return data.data;
}

export async function rejectFaq(id: string): Promise<{ success: true }> {
  const { data } = await apiClient.post<ApiSuccess<{ success: true }>>(`/ai/faq/${id}/reject`);
  return data.data;
}
