import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/lib/api/client';
import {
  confirmAiAction,
  createChatSession,
  deleteChatSession,
  listChatMessages,
  listChatSessions,
  rejectAiAction,
  sendChatMessage,
} from '@/pages/ai-assistant/api/chat-api';
import { toast } from '@/stores/toast-store';

const SESSIONS_KEY = ['ai-sessions'] as const;
const MESSAGES_KEY = ['ai-messages'] as const;

function actionErrorMessage(error: unknown, fallback: string): string {
  return axios.isAxiosError<ApiError>(error) ? (error.response?.data.error.message ?? error.message) : fallback;
}

export function useChatSessions() {
  return useQuery({ queryKey: SESSIONS_KEY, queryFn: listChatSessions });
}

export function useChatMessages(sessionId: string | undefined) {
  return useQuery({
    queryKey: [...MESSAGES_KEY, sessionId],
    queryFn: () => listChatMessages(sessionId as string),
    enabled: Boolean(sessionId),
  });
}

export function useCreateChatSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => createChatSession(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
  });
}

export function useDeleteChatSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => deleteChatSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
      toast({ title: '대화가 삭제되었습니다.', variant: 'success' });
    },
  });
}

export function useSendChatMessage(sessionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => {
      if (!sessionId) return Promise.reject(new Error('대화 세션이 없습니다.'));
      return sendChatMessage(sessionId, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...MESSAGES_KEY, sessionId] });
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
  });
}

/** "확인" — 이 시점에 실제 LeaveRequest 등 도메인 레코드가 생성된다 */
export function useConfirmAiAction(sessionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (draftId: string) => confirmAiAction(draftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...MESSAGES_KEY, sessionId] });
      toast({ title: '요청이 접수되었습니다.', variant: 'success' });
    },
    onError: (error: unknown) => {
      toast({ title: actionErrorMessage(error, '처리에 실패했습니다.'), variant: 'destructive' });
    },
  });
}

export function useRejectAiAction(sessionId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (draftId: string) => rejectAiAction(draftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...MESSAGES_KEY, sessionId] });
      toast({ title: '제안을 취소했습니다.', variant: 'success' });
    },
    onError: (error: unknown) => {
      toast({ title: actionErrorMessage(error, '처리에 실패했습니다.'), variant: 'destructive' });
    },
  });
}
