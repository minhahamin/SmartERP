import type { SalesOrderStatus } from '@/pages/sales/api/sales-orders-api';

export const STATUS_LABEL: Record<SalesOrderStatus, string> = {
  QUOTE: '견적',
  CONFIRMED: '확정',
  SHIPPED: '출고완료',
  INVOICED: '인보이스 발행',
  CANCELLED: '취소',
};

export const STATUS_BADGE_VARIANT: Record<SalesOrderStatus, 'default' | 'info' | 'primary' | 'success' | 'danger'> = {
  QUOTE: 'default',
  CONFIRMED: 'info',
  SHIPPED: 'primary',
  INVOICED: 'success',
  CANCELLED: 'danger',
};
