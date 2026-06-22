import {
  createWarehouseRecord,
  deleteWarehouseRecord,
  getWarehouses,
  updateWarehouseRecord,
  type WarehouseInput,
} from '@/mocks/warehouse-store';
import { delay } from '@/mocks/delay';

export async function listWarehouses() {
  await delay(200);
  return getWarehouses();
}

export async function createWarehouse(input: WarehouseInput) {
  await delay(350);
  return createWarehouseRecord(input);
}

export async function updateWarehouse(id: string, input: WarehouseInput) {
  await delay(350);
  return updateWarehouseRecord(id, input);
}

export async function removeWarehouse(id: string) {
  await delay(350);
  deleteWarehouseRecord(id);
}
