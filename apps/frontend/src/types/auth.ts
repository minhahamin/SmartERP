export type RoleName = 'ADMIN' | 'HR_MANAGER' | 'SALES_MANAGER' | 'EMPLOYEE';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: RoleName;
  departmentName: string;
  position: string;
  avatarUrl?: string;
}

export const ROLE_LABEL: Record<RoleName, string> = {
  ADMIN: '관리자',
  HR_MANAGER: '인사 담당자',
  SALES_MANAGER: '영업 담당자',
  EMPLOYEE: '일반 직원',
};
