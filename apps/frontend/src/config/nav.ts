import {
  LayoutDashboard,
  Sparkles,
  Users,
  Wallet,
  CalendarDays,
  Building2,
  ShieldCheck,
  Handshake,
  Package,
  Warehouse,
  ArrowLeftRight,
  Factory,
  FileText,
  Megaphone,
  BarChart3,
} from 'lucide-react';
import { ROUTES } from '@/config/routes';
import type { NavSection } from '@/types/nav';

/**
 * 사이드바 내비게이션 구조. docs/06-wireframes.md 6.2~6.7의 메뉴 순서 및
 * docs/02-users-and-permissions.md 권한 매트릭스를 기준으로 역할별 노출을 제한한다.
 * roles를 지정하지 않으면 전체 역할에 노출된다.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: '대시보드', path: ROUTES.dashboard, icon: LayoutDashboard },
      { label: 'AI 어시스턴트', path: ROUTES.aiAssistant, icon: Sparkles, accent: 'ai' },
    ],
  },
  {
    title: '인사',
    items: [
      { label: '직원 관리', path: ROUTES.employees, icon: Users },
      { label: '급여 관리', path: ROUTES.payroll, icon: Wallet, roles: ['ADMIN', 'HR_MANAGER', 'EMPLOYEE'] },
      { label: '일정 관리', path: ROUTES.schedule, icon: CalendarDays },
      { label: '부서 관리', path: ROUTES.departments, icon: Building2 },
      { label: '권한 관리', path: ROUTES.permissions, icon: ShieldCheck, roles: ['ADMIN'] },
    ],
  },
  {
    title: '영업/생산',
    items: [
      { label: '거래처 관리', path: ROUTES.partners, icon: Handshake, roles: ['ADMIN', 'SALES_MANAGER', 'EMPLOYEE'] },
      { label: '제품 관리', path: ROUTES.products, icon: Package, roles: ['ADMIN', 'SALES_MANAGER', 'EMPLOYEE'] },
      { label: '재고 관리', path: ROUTES.inventory, icon: Warehouse, roles: ['ADMIN', 'SALES_MANAGER', 'EMPLOYEE'] },
      {
        label: '입출고 관리',
        path: ROUTES.stockMovements,
        icon: ArrowLeftRight,
        roles: ['ADMIN', 'SALES_MANAGER', 'EMPLOYEE'],
      },
      { label: '생산 관리', path: ROUTES.production, icon: Factory, roles: ['ADMIN', 'SALES_MANAGER', 'EMPLOYEE'] },
    ],
  },
  {
    title: '공유',
    items: [
      { label: '문서 관리', path: ROUTES.documents, icon: FileText },
      { label: '공지사항', path: ROUTES.announcements, icon: Megaphone },
      { label: '통계 분석', path: ROUTES.statistics, icon: BarChart3 },
    ],
  },
];
