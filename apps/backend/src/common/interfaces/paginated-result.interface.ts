export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** 목록형 GET이 이 형태로 반환하면 ResponseInterceptor가 data/meta로 분리해 응답 envelope을 구성한다 */
export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export function paginate<T>(items: T[], total: number, page: number, limit: number): PaginatedResult<T> {
  return { items, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}
