/** 실제 API 호출 지연을 모사한다 — React Query 로딩 상태(Skeleton)를 의미 있게 보여주기 위함. */
export function delay(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
