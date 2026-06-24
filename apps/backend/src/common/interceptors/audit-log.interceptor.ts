import { Injectable, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { tap, type Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AUDIT_LOG_KEY, type AuditLogMeta } from '../decorators/audit-log.decorator';
import type { AuthUser } from '../interfaces/auth-user.interface';

/**
 * docs/07-database-design.md 7.6 #7 — 급여 확정, 권한 변경 등 민감 액션만 기록하며,
 * 핵심 비즈니스 트랜잭션의 응답 지연에 영향을 주지 않도록 비동기(fire-and-forget)로 적재한다.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.getAllAndOverride<AuditLogMeta | undefined>(AUDIT_LOG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!meta) return next.handle();

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthUser; params: Record<string, string>; ip: string }>();

    return next.handle().pipe(
      tap(() => {
        if (!request.user) return;
        this.prisma.auditLog
          .create({
            data: {
              companyId: request.user.companyId,
              userId: request.user.sub,
              action: meta.action,
              resource: meta.resource,
              resourceId: request.params?.id,
              ipAddress: request.ip,
            },
          })
          .catch((error: unknown) => console.error('AuditLog 기록 실패:', error));
      }),
    );
  }
}
