import { INVENTORY } from '@/mocks/products';

export function getTotalStock(productId: string): number {
  return INVENTORY.filter((i) => i.productId === productId).reduce((sum, i) => sum + i.quantity, 0);
}
