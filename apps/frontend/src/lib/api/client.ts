import axios, { type InternalAxiosRequestConfig } from 'axios';
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

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

/** 동시에 들어온 401들이 /auth/refresh를 중복 호출하지 않도록 진행 중인 재발급 Promise를 공유한다 */
let refreshPromise: Promise<string> | null = null;

/** 부팅 중 refresh와 401 인터셉터 refresh의 경합 방지 — bootstrap 완료까지 대기 */
async function waitForBootstrap(): Promise<void> {
  for (let i = 0; i < 100; i++) {
    if (!useAuthStore.getState().isInitializing) return;
    await new Promise((r) => setTimeout(r, 50));
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const config = error.config as RetriableConfig | undefined;
    const isAuthEndpoint = config?.url?.includes('/auth/login') || config?.url?.includes('/auth/refresh');
    if (!config || config._retried || isAuthEndpoint) {
      useAuthStore.getState().clearSession();
      return Promise.reject(error);
    }

    config._retried = true;
    try {
      // 앱 시작 직후 만료 세션 + 첫 쿼리 401이 겹치면 동일 쿠키로 2연타 → RT 재사용 오탐.
      // bootstrap이 진행 중이면 먼저 완료를 기다리고, 복원된 토큰으로 재시도한다.
      await waitForBootstrap();
      const currentToken = useAuthStore.getState().accessToken;
      const retriedWithFreshBoot = (config as { _bootRetried?: boolean })._bootRetried;
      if (currentToken && !retriedWithFreshBoot) {
        (config as { _bootRetried?: boolean })._bootRetried = true;
        config.headers.Authorization = `Bearer ${currentToken}`;
        return apiClient(config);
      }
      refreshPromise ??= apiClient
        .post<{ data: { accessToken: string } }>('/auth/refresh')
        .then((res) => res.data.data.accessToken)
        .finally(() => {
          refreshPromise = null;
        });
      const accessToken = await refreshPromise;
      useAuthStore.getState().setAccessToken(accessToken);
      config.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(config);
    } catch (refreshError) {
      useAuthStore.getState().clearSession();
      return Promise.reject(refreshError);
    }
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
