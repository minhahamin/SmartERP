import { apiClient, type ApiSuccess } from '@/lib/api/client';

export type PermissionAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'APPROVE';

export const PERMISSION_ACTIONS: { key: PermissionAction; label: string }[] = [
  { key: 'CREATE', label: 'C' },
  { key: 'READ', label: 'R' },
  { key: 'UPDATE', label: 'U' },
  { key: 'DELETE', label: 'D' },
  { key: 'APPROVE', label: 'A' },
];

/** 프론트엔드 모듈 키 <-> 백엔드 Permission.resource 매핑 (docs/02 2.2 권한 매트릭스 기준) */
export const PERMISSION_MODULES: { key: string; label: string; resource: string }[] = [
  { key: 'employees', label: '직원 관리', resource: 'USER' },
  { key: 'payroll', label: '급여 관리', resource: 'PAYROLL' },
  { key: 'schedule', label: '일정 관리', resource: 'SCHEDULE' },
  { key: 'departments', label: '부서 관리', resource: 'DEPARTMENT' },
  { key: 'permissions', label: '권한 관리', resource: 'PERMISSION' },
  { key: 'partners', label: '거래처 관리', resource: 'PARTNER' },
  { key: 'products', label: '제품 관리', resource: 'PRODUCT' },
  { key: 'inventory', label: '재고 관리', resource: 'INVENTORY' },
  { key: 'stockMovements', label: '입출고 관리', resource: 'STOCK_MOVEMENT' },
  { key: 'production', label: '생산 관리', resource: 'PRODUCTION' },
  { key: 'documents', label: '문서 관리', resource: 'DOCUMENT' },
  { key: 'announcements', label: '공지사항', resource: 'ANNOUNCEMENT' },
  { key: 'statistics', label: '통계 분석', resource: 'STATISTICS' },
];

export interface PermissionCatalogEntry {
  id: string;
  resource: string;
  action: PermissionAction;
}

export interface RoleWithPermissions {
  id: string;
  name: string;
  isSystem: boolean;
  memberCount: number;
  matrix: Record<string, PermissionAction[]>;
}

interface RawRole {
  id: string;
  name: string;
  isSystem: boolean;
  _count?: { users: number };
  rolePermissions: { permission: PermissionCatalogEntry }[];
}

function moduleKeyForResource(resource: string): string | undefined {
  return PERMISSION_MODULES.find((m) => m.resource === resource)?.key;
}

function toRoleWithPermissions(raw: RawRole): RoleWithPermissions {
  const matrix: Record<string, PermissionAction[]> = {};
  for (const module of PERMISSION_MODULES) matrix[module.key] = [];
  for (const rp of raw.rolePermissions) {
    const moduleKey = moduleKeyForResource(rp.permission.resource);
    if (moduleKey) matrix[moduleKey].push(rp.permission.action);
  }
  return { id: raw.id, name: raw.name, isSystem: raw.isSystem, memberCount: raw._count?.users ?? 0, matrix };
}

export async function listRolesWithPermissions(): Promise<RoleWithPermissions[]> {
  const { data } = await apiClient.get<ApiSuccess<RawRole[]>>('/roles');
  return data.data.map(toRoleWithPermissions);
}

export async function listAllPermissions(): Promise<PermissionCatalogEntry[]> {
  const { data } = await apiClient.get<ApiSuccess<PermissionCatalogEntry[]>>('/roles/permissions');
  return data.data;
}

export async function setRolePermissions(roleId: string, permissionIds: string[]): Promise<RoleWithPermissions> {
  const { data } = await apiClient.put<ApiSuccess<RawRole>>(`/roles/${roleId}/permissions`, { permissionIds });
  return toRoleWithPermissions(data.data);
}

export function toggleAction(actions: PermissionAction[], action: PermissionAction): PermissionAction[] {
  return actions.includes(action) ? actions.filter((a) => a !== action) : [...actions, action];
}

/** 토글 후의 전체 매트릭스를 PUT /roles/:id/permissions가 요구하는 permissionId 목록으로 변환한다 */
export function buildPermissionIds(
  catalog: PermissionCatalogEntry[],
  matrix: Record<string, PermissionAction[]>,
): string[] {
  const ids: string[] = [];
  for (const module of PERMISSION_MODULES) {
    for (const action of matrix[module.key] ?? []) {
      const found = catalog.find((p) => p.resource === module.resource && p.action === action);
      if (found) ids.push(found.id);
    }
  }
  return ids;
}
