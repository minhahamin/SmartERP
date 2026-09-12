import type { LucideIcon } from 'lucide-react';
import type { RoleName } from '@/types/auth';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** 지정하면 해당 리소스의 권한(user.permissions)이 있어야 노출된다. 지정하지 않으면 전체 역할에 노출된다. */
  resource?: string;
  /** resource와 함께 검사할 액션. 지정하지 않으면 READ(대부분의 목록 화면과 동일) */
  action?: string;
  /** resource 권한이 없어도 이 역할이면 노출한다 — RolePermission에 없는 "본인 데이터만" 화면 전용(예: 급여의 EMPLOYEE) */
  selfServiceRoles?: RoleName[];
  /** AI 어시스턴트처럼 별도 액센트 컬러로 강조할 때 사용 */
  accent?: 'ai';
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}
