import type { RoleName } from '@/types/auth';

/** user.permissions는 백엔드 RolePermission 테이블을 그대로 반영한 "RESOURCE:ACTION" 문자열 목록이다 */
export function hasPermission(permissions: string[] | undefined, resource: string, action = 'READ'): boolean {
  return permissions?.includes(`${resource}:${action}`) ?? false;
}

/**
 * 사이드바/라우트 가드 공통 판단 로직.
 * resource가 없으면 전체 역할에 노출한다(대시보드/AI 어시스턴트처럼 권한 개념이 없는 화면).
 * selfServiceRoles는 급여 화면의 EMPLOYEE(본인 급여만 조회)처럼, RolePermission 매트릭스에는
 * 없지만 백엔드가 별도의 "본인 데이터는 항상 허용" 엔드포인트(예: GET /payroll/me)를 갖고 있는
 * 화면에서만 사용한다 — 화면이 실제로 그런 자기 자신 전용 API로 분기하지 않는데 여기 추가하면
 * 안 된다(그러면 권한 없는 데이터 조회 시도로 이어져 백엔드 403만 만나게 된다).
 */
export function canAccessNavItem(
  item: { resource?: string; action?: string; selfServiceRoles?: RoleName[] },
  permissions: string[] | undefined,
  role: RoleName | undefined,
): boolean {
  if (!item.resource) return true;
  if (hasPermission(permissions, item.resource, item.action)) return true;
  return Boolean(role && item.selfServiceRoles?.includes(role));
}
