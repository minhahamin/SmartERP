import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import type { PaginatedResult } from '../interfaces/paginated-result.interface';

interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: PaginatedResult<unknown>['meta'];
}

function isPaginatedResult(value: unknown): value is PaginatedResult<unknown> {
  return Boolean(value) && typeof value === 'object' && 'items' in (value as object) && 'meta' in (value as object);
}

/** docs/08-api-design.md 8.1 — 모든 성공 응답을 `{ success, data, meta? }` envelope으로 래핑한다 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessEnvelope<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<SuccessEnvelope<T>> {
    return next.handle().pipe(
      map((result) => {
        if (isPaginatedResult(result)) {
          return { success: true, data: result.items as T, meta: result.meta };
        }
        return { success: true, data: result };
      }),
    );
  }
}
