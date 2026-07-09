import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createChatSession,
  deleteChatSession,
  listChatMessages,
  listChatSessions,
  sendChatMessage,
} from '@/pages/ai-assistant/api/chat-api';
import { toast } from '@/stores/toast-store';

const SESSIONS_KEY = ['ai-sessions'] as const;
const MESSAGES_KEY = ['ai-messages'] as const;

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
