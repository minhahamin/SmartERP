import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createChatSession, listChatMessages, listChatSessions, sendChatMessage } from '@/pages/ai-assistant/api/chat-api';
import { useAuthStore } from '@/stores/auth-store';

const SESSIONS_KEY = ['ai-sessions'] as const;
const MESSAGES_KEY = ['ai-messages'] as const;

export function useChatSessions() {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: [...SESSIONS_KEY, userId],
    queryFn: () => listChatSessions(userId as string),
    enabled: Boolean(userId),
  });
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
  const userId = useAuthStore((state) => state.user?.id);
  return useMutation({
    mutationFn: () => createChatSession(userId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
  });
}

export function useSendChatMessage(sessionId: string | undefined) {
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.user?.role);
  const userId = useAuthStore((state) => state.user?.id);

  return useMutation({
    mutationFn: (content: string) => {
      if (!sessionId || !role || !userId) throw new Error('세션 또는 사용자 정보가 없습니다.');
      return sendChatMessage(sessionId, content, { role, userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...MESSAGES_KEY, sessionId] });
      queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
  });
}
