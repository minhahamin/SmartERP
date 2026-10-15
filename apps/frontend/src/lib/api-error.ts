import axios from 'axios';
import type { ApiError } from '@/lib/api/client';

/**
 * 서버가 envelope(`{ success: false, error: { message } }`)로 돌려준 사용자용 메시지를 꺼낸다.
 * 네트워크 단절처럼 응답이 없으면 그에 맞는 문구를, 그 외에는 fallback을 쓴다.
 */
export function getApiErrorMessage(error: unknown, fallback = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.'): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const message = error.response?.data?.error?.message;
    if (message) return message;
    if (!error.response) return '서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.';
    if (error.response.status === 429) return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  }
  return fallback;
}
