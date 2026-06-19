import axios from 'axios';
import { useAuthStore } from '@/stores/auth-store';

/**
 * NestJS API(docs/08-api-design.md) 호출용 axios 인스턴스.
 * - Authorization 헤더는 메모리에 보관된 Access Token에서 매 요청마다 읍어온다.
 * - withCredentials: Refresh Token이 httpOnly 쿠키로 전달되는 /auth/refresh 호출을 위해 필요(docs/12).
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // TODO: 백엔드 연동 시 /auth/refresh 1회 재시도 후 그래도 실패하면 로그아웃 처리
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);

/** docs/08-api-design.md 8.1 공통 응답 envelope */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
  };
}
