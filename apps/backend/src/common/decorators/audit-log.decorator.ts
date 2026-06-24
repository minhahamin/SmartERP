import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_KEY = 'auditLog';

export interface AuditLogMeta {
  action: string;
  resource: string;
}

/** @Audit('PAYROLL_CONFIRM', 'PAYROLL') — 급여 확정/권한 변경처럼 민감한 액션에만 부착한다 (docs/07 7.6 #7) */
export const Audit = (action: string, resource: string) => SetMetadata(AUDIT_LOG_KEY, { action, resource });
