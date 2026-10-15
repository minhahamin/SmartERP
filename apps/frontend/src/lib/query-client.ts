import axios from 'axios';
import { MutationCache, QueryClient } from '@tanstack/react-query';
import { getApiErrorMessage } from '@/lib/api-error';
import { toast } from '@/stores/toast-store';

export const queryClient = new QueryClient({
  // 개별 훅이 onError를 정의하지 않은 모든 뮤테이션의 실패를 한 곳에서 사용자에게 알린다.
  // (이전에는 일부 훅만 처리해서, 서버가 409/403/500을 줘도 화면에는 아무 반응이 없었다)
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.options.onError) return; // 훅이 직접 처리하는 경우 중복 토스트 방지
      // 401은 axios 인터셉터가 세션 정리/재로그인을 처리한다
      if (axios.isAxiosError(error) && error.response?.status === 401) return;
      toast({ title: getApiErrorMessage(error), variant: 'destructive' });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
