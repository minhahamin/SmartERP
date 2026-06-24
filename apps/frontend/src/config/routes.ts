/**
 * 라우트 경로 단일 소스. 컴포넌트/네비게이션 어디서든 문자열 리터럴 대신 이 상수를 참조한다.
 */
export const ROUTES = {
  login: '/login',
  signup: '/signup',
  changePassword: '/change-password',
  dashboard: '/',
  aiAssistant: '/ai-assistant',
  employees: '/employees',
  payroll: '/payroll',
  schedule: '/schedule',
  departments: '/departments',
  permissions: '/permissions',
  partners: '/partners',
  products: '/products',
  inventory: '/inventory',
  stockMovements: '/stock-movements',
  production: '/production',
  documents: '/documents',
  announcements: '/announcements',
  statistics: '/statistics',
  profile: '/profile',
} as const;

export type RouteKey = keyof typeof ROUTES;
