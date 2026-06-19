import type { RoleName } from '@/types/auth';

export type PermissionAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'APPROVE';

export const PERMISSION_ACTIONS: { key: PermissionAction; label: string }[] = [
  { key: 'CREATE', label: 'C' },
  { key: 'READ', label: 'R' },
  { key: 'UPDATE', label: 'U' },
  { key: 'DELETE', label: 'D' },
  { key: 'APPROVE', label: 'A' },
];

export const PERMISSION_MODULES: { key: string; label: string }[] = [
  { key: 'employees', label: '직원 관리' },
  { key: 'payroll', label: '급여 관리' },
  { key: 'schedule', label: '일정 관리' },
  { key: 'departments', label: '부서 관리' },
  { key: 'permissions', label: '권한 관리' },
  { key: 'partners', label: '거래처 관리' },
  { key: 'products', label: '제품 관리' },
  { key: 'inventory', label: '재고 관리' },
  { key: 'stockMovements', label: '입출고 관리' },
  { key: 'production', label: '생산 관리' },
  { key: 'documents', label: '문서 관리' },
  { key: 'announcements', label: '공지사항' },
  { key: 'statistics', label: '통계 분석' },
];

const CRUD: PermissionAction[] = ['CREATE', 'READ', 'UPDATE', 'DELETE'];
const CRUDA: PermissionAction[] = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE'];

export type PermissionMatrix = Record<RoleName, Record<string, PermissionAction[]>>;

/** docs/02-users-and-permissions.md 2.2 권한 매트릭스를 그대로 시드 데이터로 변환 */
export const PERMISSION_MATRIX_SEED: PermissionMatrix = {
  ADMIN: {
    employees: CRUD,
    payroll: CRUDA,
    schedule: CRUD,
    departments: CRUD,
    permissions: CRUD,
    partners: CRUD,
    products: CRUD,
    inventory: CRUD,
    stockMovements: CRUD,
    production: CRUD,
    documents: CRUD,
    announcements: CRUD,
    statistics: CRUD,
  },
  HR_MANAGER: {
    employees: CRUD,
    payroll: CRUDA,
    schedule: CRUD,
    departments: ['READ'],
    permissions: [],
    partners: [],
    products: [],
    inventory: [],
    stockMovements: [],
    production: [],
    documents: CRUD,
    announcements: ['CREATE', 'READ'],
    statistics: ['READ'],
  },
  SALES_MANAGER: {
    employees: ['READ'],
    payroll: [],
    schedule: CRUD,
    departments: ['READ'],
    permissions: [],
    partners: CRUD,
    products: ['READ', 'UPDATE'],
    inventory: ['READ'],
    stockMovements: ['CREATE', 'READ'],
    production: ['READ'],
    documents: CRUD,
    announcements: ['CREATE', 'READ'],
    statistics: ['READ'],
  },
  EMPLOYEE: {
    employees: ['READ', 'UPDATE'],
    payroll: ['READ'],
    schedule: CRUD,
    departments: ['READ'],
    permissions: [],
    partners: ['READ'],
    products: ['READ'],
    inventory: ['READ'],
    stockMovements: ['CREATE'],
    production: CRUD,
    documents: ['READ', 'CREATE'],
    announcements: ['READ'],
    statistics: ['READ'],
  },
};
