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
  /** "RESOURCE:ACTION" 형태(예: "PAYROLL:READ") — 사이드바/라우트 가드가 이 목록으로 화면 노출을 판단한다 */
  permissions: string[];
}

export const ROLE_LABEL: Record<RoleName, string> = {
  ADMIN: '관리자',
  HR_MANAGER: '인사 담당자',
  SALES_MANAGER: '영업 담당자',
  EMPLOYEE: '일반 직원',
};

/** 권한 관리 화면에서 만든 커스텀 역할은 ROLE_LABEL에 없으므로 원래 이름을 그대로 보여준다 */
export function roleLabel(roleName: string): string {
  return ROLE_LABEL[roleName as RoleName] ?? roleName;
}
