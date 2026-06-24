import { SetMetadata } from '@nestjs/common';
import type { PermissionAction } from '@prisma/client';

export const PERMISSIONS_KEY = 'permissions';

/**
 * @RequirePermissions('PAYROLL', 'APPROVE') — 본인(own) 스코프 접근은 이 데코레이터를 붙이지 않고
 * 별도의 self-scoped 라우트(예: GET /payrolls/me)로 분리한다 (docs/02 2.3, docs/08 8.4.2/8.4.3 참고).
 */
export const RequirePermissions = (resource: string, action: PermissionAction) =>
  SetMetadata(PERMISSIONS_KEY, { resource, action });
