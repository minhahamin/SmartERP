import { apiClient, type ApiSuccess } from '@/lib/api/client';

/** 백엔드가 내려주는 /uploads/... 상대 경로를 <img>에 쓸 수 있는 절대 URL로 바꾼다 */
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1').replace(/\/api\/v1\/?$/, '');

export function toAbsoluteImageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return path.startsWith('http') ? path : `${API_ORIGIN}${path}`;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  unit: string;
  salePrice: number;
  costPrice: number;
  safetyStock: number;
  isActive: boolean;
  imageUrl: string | null;
}

interface RawProduct extends Omit<Product, 'salePrice' | 'costPrice'> {
  salePrice: string | number;
  costPrice: string | number;
}

function toProduct(raw: RawProduct): Product {
  return { ...raw, salePrice: Number(raw.salePrice), costPrice: Number(raw.costPrice) };
}

export interface ProductListQuery {
  search?: string;
  category?: string;
}

export interface ProductInput {
  /** 비워두면 백엔드가 자동 생성한다(PRD-1000부터 순번) */
  sku?: string;
  name: string;
  category: string;
  unit: string;
  salePrice: number;
  costPrice: number;
  safetyStock: number;
}

export async function listProducts(query: ProductListQuery): Promise<Product[]> {
  const { data } = await apiClient.get<ApiSuccess<RawProduct[]>>('/products', {
    params: { ...query, page: 1, limit: 100 },
  });
  return data.data.map(toProduct);
}

export async function getProduct(id: string): Promise<Product> {
  const { data } = await apiClient.get<ApiSuccess<RawProduct>>(`/products/${id}`);
  return toProduct(data.data);
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const { data } = await apiClient.post<ApiSuccess<RawProduct>>('/products', {
    ...input,
    sku: input.sku || undefined,
  });
  return toProduct(data.data);
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product> {
  const { data } = await apiClient.patch<ApiSuccess<RawProduct>>(`/products/${id}`, input);
  return toProduct(data.data);
}

export async function setProductActive(id: string, isActive: boolean): Promise<Product> {
  const { data } = await apiClient.patch<ApiSuccess<RawProduct>>(`/products/${id}`, { isActive });
  return toProduct(data.data);
}

export async function uploadProductImage(id: string, file: File): Promise<Product> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<ApiSuccess<RawProduct>>(`/products/${id}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return toProduct(data.data);
}

export interface InventoryRow {
  productId: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
}

interface RawInventoryRow {
  productId: string;
  quantity: number;
  warehouse: { id: string; name: string };
}

/** 창고별 재고 원본 — 제품 목록의 "총 재고" 합계와 상세 페이지의 창고별 현황에서 함께 쓴다 */
export async function listInventoryRows(): Promise<InventoryRow[]> {
  const { data } = await apiClient.get<ApiSuccess<RawInventoryRow[]>>('/inventory', { params: { limit: 100 } });
  return data.data.map((row) => ({
    productId: row.productId,
    warehouseId: row.warehouse.id,
    warehouseName: row.warehouse.name,
    quantity: row.quantity,
  }));
}
