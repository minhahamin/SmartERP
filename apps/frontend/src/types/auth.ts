export type RoleName = 'ADMIN' | 'HR_MANAGER' | 'SALES_MANAGER' | 'EMPLOYEE';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: RoleName;
  departmentName: string;
  position: string;
  avatarUrl?: string;
  /** 초대 가입자가 임시 비밀번호로 로그인한 경우 true — 비밀번호 변경 화면으로 강제 이동시킨다 */
  mustChangePassword: boolean;
}

export const ROLE_LABEL: Record<RoleName, string> = {
  ADMIN: '관리자',
  HR_MANAGER: '인사 담당자',
  SALES_MANAGER: '영업 담당자',
  EMPLOYEE: '일반 직원',
};
