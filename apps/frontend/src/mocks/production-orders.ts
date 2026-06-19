export type ProductionStatus = 'PLANNED' | 'IN_PROGRESS' | 'DELAYED' | 'COMPLETED' | 'CANCELLED';

export interface ProductionOrder {
  id: string;
  orderNo: string;
  productId: string;
  plannedQty: number;
  producedQty: number;
  status: ProductionStatus;
  lineName: string;
  startDate: string;
  dueDate: string;
  managerId: string;
}

export const PRODUCTION_ORDERS: ProductionOrder[] = [
  { id: 'po-1', orderNo: 'PO-2026-009', productId: 'product-1', plannedQty: 200, producedQty: 200, status: 'COMPLETED', lineName: '1라인', startDate: '2026-05-28', dueDate: '2026-06-04', managerId: 'emp-1031' },
  { id: 'po-2', orderNo: 'PO-2026-011', productId: 'product-1', plannedQty: 150, producedQty: 150, status: 'COMPLETED', lineName: '1라인', startDate: '2026-06-06', dueDate: '2026-06-13', managerId: 'emp-1102' },
  { id: 'po-3', orderNo: 'PO-2026-012', productId: 'product-10', plannedQty: 120, producedQty: 80, status: 'DELAYED', lineName: '2라인', startDate: '2026-06-08', dueDate: '2026-06-15', managerId: 'emp-1102' },
  { id: 'po-4', orderNo: 'PO-2026-013', productId: 'product-6', plannedQty: 60, producedQty: 30, status: 'DELAYED', lineName: '1라인', startDate: '2026-06-09', dueDate: '2026-06-17', managerId: 'emp-1031' },
  { id: 'po-5', orderNo: 'PO-2026-014', productId: 'product-4', plannedQty: 100, producedQty: 55, status: 'IN_PROGRESS', lineName: '2라인', startDate: '2026-06-15', dueDate: '2026-06-22', managerId: 'emp-1031' },
  { id: 'po-6', orderNo: 'PO-2026-015', productId: 'product-2', plannedQty: 180, producedQty: 40, status: 'IN_PROGRESS', lineName: '1라인', startDate: '2026-06-16', dueDate: '2026-06-24', managerId: 'emp-1102' },
  { id: 'po-7', orderNo: 'PO-2026-016', productId: 'product-3', plannedQty: 300, producedQty: 0, status: 'IN_PROGRESS', lineName: '2라인', startDate: '2026-06-18', dueDate: '2026-06-25', managerId: 'emp-1105' },
  { id: 'po-8', orderNo: 'PO-2026-017', productId: 'product-9', plannedQty: 250, producedQty: 0, status: 'PLANNED', lineName: '1라인', startDate: '2026-06-22', dueDate: '2026-06-29', managerId: 'emp-1031' },
  { id: 'po-9', orderNo: 'PO-2026-018', productId: 'product-1', plannedQty: 200, producedQty: 0, status: 'PLANNED', lineName: '2라인', startDate: '2026-06-24', dueDate: '2026-07-01', managerId: 'emp-1105' },
];
