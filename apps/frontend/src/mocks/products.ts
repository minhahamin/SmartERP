export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  salePrice: number;
  costPrice: number;
  safetyStock: number;
  isActive: boolean;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
}

export interface InventoryRecord {
  productId: string;
  warehouseId: string;
  quantity: number;
}

export const PRODUCTS: Product[] = [
  { id: 'product-1', sku: 'BOLT-M6-SUS', name: '스테인리스 볼트 M6', category: '부품', unit: 'EA', salePrice: 1200, costPrice: 700, safetyStock: 100, isActive: true },
  { id: 'product-2', sku: 'BRK-AL-001', name: '알루미늄 브라켓', category: '부품', unit: 'EA', salePrice: 3500, costPrice: 2100, safetyStock: 100, isActive: true },
  { id: 'product-3', sku: 'PKG-BOX-L', name: '패킹박스 L', category: '포장재', unit: 'EA', salePrice: 800, costPrice: 450, safetyStock: 50, isActive: true },
  { id: 'product-4', sku: 'PIPE-PVC-20', name: 'PVC 파이프 20A', category: '자재', unit: 'M', salePrice: 2500, costPrice: 1600, safetyStock: 30, isActive: true },
  { id: 'product-5', sku: 'WSH-SPR-8', name: '스프링와셔 8mm', category: '부품', unit: 'EA', salePrice: 150, costPrice: 80, safetyStock: 200, isActive: true },
  { id: 'product-6', sku: 'PRF-AL-4040', name: '알루미늄 프로파일 40x40', category: '자재', unit: 'M', salePrice: 12000, costPrice: 8500, safetyStock: 40, isActive: true },
  { id: 'product-7', sku: 'PKG-BOX-M', name: '패킹박스 M', category: '포장재', unit: 'EA', salePrice: 600, costPrice: 320, safetyStock: 80, isActive: true },
  { id: 'product-8', sku: 'PIPE-PVC-25', name: 'PVC 파이프 25A', category: '자재', unit: 'M', salePrice: 3200, costPrice: 2100, safetyStock: 30, isActive: true },
  { id: 'product-9', sku: 'NUT-M6-SUS', name: '스테인리스 너트 M6', category: '부품', unit: 'EA', salePrice: 400, costPrice: 220, safetyStock: 150, isActive: true },
  { id: 'product-10', sku: 'GSK-RBR-001', name: '고무 패킹', category: '부품', unit: 'EA', salePrice: 900, costPrice: 500, safetyStock: 60, isActive: false },
];

export const WAREHOUSES: Warehouse[] = [
  { id: 'wh-1', name: '1창고', location: '경기도 안산시' },
  { id: 'wh-2', name: '2창고', location: '충청남도 아산시' },
];

export const INVENTORY: InventoryRecord[] = [
  { productId: 'product-1', warehouseId: 'wh-1', quantity: 42 },
  { productId: 'product-1', warehouseId: 'wh-2', quantity: 120 },
  { productId: 'product-2', warehouseId: 'wh-1', quantity: 58 },
  { productId: 'product-2', warehouseId: 'wh-2', quantity: 140 },
  { productId: 'product-3', warehouseId: 'wh-1', quantity: 70 },
  { productId: 'product-3', warehouseId: 'wh-2', quantity: 15 },
  { productId: 'product-4', warehouseId: 'wh-1', quantity: 45 },
  { productId: 'product-4', warehouseId: 'wh-2', quantity: 8 },
  { productId: 'product-5', warehouseId: 'wh-1', quantity: 320 },
  { productId: 'product-6', warehouseId: 'wh-1', quantity: 60 },
  { productId: 'product-7', warehouseId: 'wh-2', quantity: 150 },
  { productId: 'product-8', warehouseId: 'wh-2', quantity: 55 },
  { productId: 'product-9', warehouseId: 'wh-1', quantity: 410 },
  { productId: 'product-10', warehouseId: 'wh-1', quantity: 88 },
];

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function getWarehouseById(id: string): Warehouse | undefined {
  return WAREHOUSES.find((w) => w.id === id);
}
