import {
  LayoutDashboard,
  Sparkles,
  Users,
  Wallet,
  CalendarDays,
  Building2,
  ShieldCheck,
  Handshake,
  ShoppingCart,
  Package,
  Warehouse,
  ArrowLeftRight,
  Factory,
  FileText,
  Megaphone,
  BarChart3,
  MessagesSquare,
} from 'lucide-react';
import { ROUTES } from '@/config/routes';
import type { NavSection } from '@/types/nav';

/**
 * 사이드바 내비게이션 구조. docs/06-wireframes.md 6.2~6.7의 메뉴 순서를 따르되, 노출 여부는
 * 하드코딩된 역할 목록이 아니라 실제 RolePermission 테이블(user.permissions)로 판단한다 —
 * resource를 지정하면 해당 리소스의 READ 권한이 있을 때만 보인다(/permissions에서 권한을
 * 바꾸면 재로그인 후 메뉴에도 그대로 반영됨). resource를 지정하지 않으면 전체 역할에 노출된다.
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
      { label: '직원 관리', path: ROUTES.employees, icon: Users, resource: 'USER' },
      // EMPLOYEE는 PAYROLL 권한이 없어도 본인 급여(/payroll/me)만 보는 화면이 따로 있다(payroll-page.tsx)
      { label: '급여 관리', path: ROUTES.payroll, icon: Wallet, resource: 'PAYROLL', selfServiceRoles: ['EMPLOYEE'] },
      { label: '일정 관리', path: ROUTES.schedule, icon: CalendarDays, resource: 'SCHEDULE' },
      { label: '부서 관리', path: ROUTES.departments, icon: Building2, resource: 'DEPARTMENT' },
      { label: '권한 관리', path: ROUTES.permissions, icon: ShieldCheck, resource: 'PERMISSION' },
    ],
  },
  {
    title: '영업/생산',
    items: [
      { label: '거래처 관리', path: ROUTES.partners, icon: Handshake, resource: 'PARTNER' },
      { label: '영업 관리', path: ROUTES.salesOrders, icon: ShoppingCart, resource: 'SALES_ORDER' },
      { label: '제품 관리', path: ROUTES.products, icon: Package, resource: 'PRODUCT' },
      { label: '재고 관리', path: ROUTES.inventory, icon: Warehouse, resource: 'INVENTORY' },
      { label: '입출고 관리', path: ROUTES.stockMovements, icon: ArrowLeftRight, resource: 'STOCK_MOVEMENT' },
      { label: '생산 관리', path: ROUTES.production, icon: Factory, resource: 'PRODUCTION' },
    ],
  },
  {
    title: '공유',
    items: [
      { label: '문서 관리', path: ROUTES.documents, icon: FileText, resource: 'DOCUMENT' },
      { label: '공지사항', path: ROUTES.announcements, icon: Megaphone, resource: 'ANNOUNCEMENT' },
      // FAQ 관리는 조회 화면이 아니라 자동생성/게시 같은 작성 작업 위주라 DOCUMENT:CREATE로 게이팅한다(백엔드 ai-chat.controller.ts와 동일 기준)
      { label: 'FAQ 관리', path: ROUTES.faq, icon: MessagesSquare, resource: 'DOCUMENT', action: 'CREATE' },
      { label: '통계 분석', path: ROUTES.statistics, icon: BarChart3, resource: 'STATISTICS' },
    ],
  },
];
