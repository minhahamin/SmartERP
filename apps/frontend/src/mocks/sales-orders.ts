export type SalesOrderStatus = 'QUOTE' | 'CONFIRMED' | 'SHIPPED' | 'INVOICED' | 'CANCELLED';

export interface SalesOrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface SalesOrder {
  id: string;
  orderNo: string;
  partnerId: string;
  orderDate: string;
  status: SalesOrderStatus;
  items: SalesOrderItem[];
  totalAmount: number;
}

export const SALES_ORDER_STATUS_LABEL: Record<SalesOrderStatus, string> = {
  QUOTE: '견적',
  CONFIRMED: '확정',
  SHIPPED: '출고완료',
  INVOICED: '인보이스 발행',
  CANCELLED: '취소',
};

export const SALES_ORDERS: SalesOrder[] = [
  { id: 'so-1', orderNo: 'SO-2026-0601', partnerId: 'partner-1', orderDate: '2026-06-14', status: 'SHIPPED', items: [{ productId: 'product-1', quantity: 80, unitPrice: 1200 }], totalAmount: 96_000 },
  { id: 'so-2', orderNo: 'SO-2026-0512', partnerId: 'partner-1', orderDate: '2026-05-20', status: 'INVOICED', items: [{ productId: 'product-2', quantity: 50, unitPrice: 3500 }], totalAmount: 175_000 },
  { id: 'so-3', orderNo: 'SO-2026-0598', partnerId: 'partner-3', orderDate: '2026-06-10', status: 'INVOICED', items: [{ productId: 'product-3', quantity: 40, unitPrice: 800 }], totalAmount: 32_000 },
  { id: 'so-4', orderNo: 'SO-2026-0589', partnerId: 'partner-5', orderDate: '2026-06-02', status: 'SHIPPED', items: [{ productId: 'product-2', quantity: 60, unitPrice: 3500 }], totalAmount: 210_000 },
  { id: 'so-5', orderNo: 'SO-2026-0577', partnerId: 'partner-6', orderDate: '2026-05-18', status: 'INVOICED', items: [{ productId: 'product-8', quantity: 18, unitPrice: 3200 }], totalAmount: 57_600 },
  { id: 'so-6', orderNo: 'SO-2026-0605', partnerId: 'partner-8', orderDate: '2026-03-29', status: 'CANCELLED', items: [{ productId: 'product-9', quantity: 90, unitPrice: 400 }], totalAmount: 36_000 },
  { id: 'so-7', orderNo: 'SO-2026-0610', partnerId: 'partner-1', orderDate: '2026-06-19', status: 'QUOTE', items: [{ productId: 'product-1', quantity: 100, unitPrice: 1200 }], totalAmount: 120_000 },
];

export function getSalesOrdersByPartner(partnerId: string): SalesOrder[] {
  return SALES_ORDERS.filter((o) => o.partnerId === partnerId).sort((a, b) => (a.orderDate < b.orderDate ? 1 : -1));
}
