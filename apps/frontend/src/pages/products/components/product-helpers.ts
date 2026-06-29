import type { InventoryRow } from '@/pages/products/api/products-api';

export function getTotalStock(rows: InventoryRow[] | undefined, productId: string): number {
  if (!rows) return 0;
  return rows.filter((r) => r.productId === productId).reduce((sum, r) => sum + r.quantity, 0);
}
