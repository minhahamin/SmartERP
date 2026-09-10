/** count()+1 주문번호/사번 생성의 동시요청 P2002 경합을 흡수하는 재시도 헬퍼 */
export async function retryOnDuplicate<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code !== 'P2002' || attempt === retries) throw error;
      lastError = error;
      // 다음 시도에서 다른 번호가 나오도록 아주 짧게 대기 (지터)
      await new Promise((resolve) => setTimeout(resolve, 20 + Math.random() * 60));
    }
  }
  throw lastError;
}
