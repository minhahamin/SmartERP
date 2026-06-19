import { EMPLOYEES } from '@/mocks/employees';
import { DEPARTMENTS } from '@/mocks/departments';
import { PARTNERS } from '@/mocks/partners';
import { PRODUCTS } from '@/mocks/products';
import { getInventorySnapshot } from '@/mocks/inventory-store';
import { SALES_ORDERS } from '@/mocks/sales-orders';
import { ROLE_LABEL, type RoleName } from '@/types/auth';
import { delay } from '@/mocks/delay';

export interface ChartPoint {
  label: string;
  value: number;
}

export interface SalesStats {
  monthlyTrend: ChartPoint[];
  byPartner: ChartPoint[];
}

export interface InventoryStats {
  byWarehouse: ChartPoint[];
  byCategory: ChartPoint[];
}

export interface HrStats {
  byDepartment: ChartPoint[];
  byRole: ChartPoint[];
}

const MONTHLY_REVENUE_MILLIONS: ChartPoint[] = [
  { label: '1월', value: 312 },
  { label: '2월', value: 298 },
  { label: '3월', value: 355 },
  { label: '4월', value: 340 },
  { label: '5월', value: 412 },
  { label: '6월', value: 482 },
];

export async function getSalesStats(): Promise<SalesStats> {
  await delay(300);
  const byPartnerMap = new Map<string, number>();
  for (const order of SALES_ORDERS) {
    if (order.status === 'CANCELLED') continue;
    byPartnerMap.set(order.partnerId, (byPartnerMap.get(order.partnerId) ?? 0) + order.totalAmount);
  }
  const byPartner = Array.from(byPartnerMap.entries())
    .map(([partnerId, amount]) => ({ label: PARTNERS.find((p) => p.id === partnerId)?.name ?? partnerId, value: Math.round(amount / 1000) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return { monthlyTrend: MONTHLY_REVENUE_MILLIONS, byPartner };
}

export async function getInventoryStats(): Promise<InventoryStats> {
  await delay(300);
  const inventory = getInventorySnapshot();

  const byWarehouseMap = new Map<string, number>();
  for (const record of inventory) {
    byWarehouseMap.set(record.warehouseId, (byWarehouseMap.get(record.warehouseId) ?? 0) + record.quantity);
  }
  const byWarehouse = Array.from(byWarehouseMap.entries()).map(([warehouseId, qty]) => ({
    label: warehouseId === 'wh-1' ? '1창고' : '2창고',
    value: qty,
  }));

  const byCategoryMap = new Map<string, number>();
  for (const record of inventory) {
    const product = PRODUCTS.find((p) => p.id === record.productId);
    if (!product) continue;
    byCategoryMap.set(product.category, (byCategoryMap.get(product.category) ?? 0) + record.quantity);
  }
  const byCategory = Array.from(byCategoryMap.entries()).map(([category, value]) => ({ label: category, value }));

  return { byWarehouse, byCategory };
}

export async function getHrStats(): Promise<HrStats> {
  await delay(300);
  const active = EMPLOYEES.filter((e) => e.status !== 'RESIGNED');

  const byDepartment = DEPARTMENTS.filter((d) => d.parentId !== null || !DEPARTMENTS.some((c) => c.parentId === d.id))
    .map((d) => ({ label: d.name, value: active.filter((e) => e.departmentId === d.id).length }))
    .filter((row) => row.value > 0);

  const roleOrder: RoleName[] = ['ADMIN', 'HR_MANAGER', 'SALES_MANAGER', 'EMPLOYEE'];
  const byRole = roleOrder.map((role) => ({ label: ROLE_LABEL[role], value: active.filter((e) => e.role === role).length }));

  return { byDepartment, byRole };
}
