const TRANSIENT_STATUS = new Set([429, 500, 502, 503, 504]);

/** @google/genai의 ApiError는 status를 갖고, 없으면 메시지의 {"error":{"code":503}} JSON에서 읽는다 */
export function httpStatusOf(error: unknown): number | undefined {
  const status = (error as { status?: unknown })?.status;
  if (typeof status === 'number') return status;
  const message = error instanceof Error ? error.message : String(error);
  const matched = /"code"\s*:\s*(\d{3})/.exec(message);
  return matched ? Number(matched[1]) : undefined;
}

export function isTransientError(error: unknown): boolean {
  const status = httpStatusOf(error);
  return status !== undefined && TRANSIENT_STATUS.has(status);
}

interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * 외부 API(Gemini)의 일시적 장애(429/5xx)만 지수 백오프로 재시도한다.
 * 400/401/403처럼 재시도해도 소용없는 오류는 즉시 던진다.
 */
export async function retryTransient<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    retries = 2,
    baseDelayMs = 1000,
    sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  } = options;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= retries || !isTransientError(error)) throw error;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
}
