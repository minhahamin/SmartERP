import type { LucideIcon } from 'lucide-react';
import type { RoleName } from '@/types/auth';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** 지정하지 않으면 전체 역할이 접근 가능 */
  roles?: RoleName[];
  /** AI 어시스턴트처럼 별도 액센트 컬러로 강조할 때 사용 */
  accent?: 'ai';
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}
