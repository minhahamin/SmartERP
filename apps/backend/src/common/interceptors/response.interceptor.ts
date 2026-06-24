import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, type Observable } from 'rxjs';
import type { PaginatedResult } from '../interfaces/paginated-result.interface';
import { SKIP_RESPONSE_ENVELOPE_KEY } from '../decorators/skip-response-envelope.decorator';

interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: PaginatedResult<unknown>['meta'];
}

function isPaginatedResult(value: unknown): value is PaginatedResult<unknown> {
  return (
    Boolean(value) && typeof value === 'object' && 'items' in (value as object) && 'meta' in (value as object)
  );
}

/** docs/08-api-design.md 8.1 — 모든 성공 응답을 `{ success, data, meta? }` envelope으로 래핑한다 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessEnvelope<T> | T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<SuccessEnvelope<T> | T> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RESPONSE_ENVELOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return next.handle();

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
