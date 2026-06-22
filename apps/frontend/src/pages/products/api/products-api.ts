import { PRODUCTS, type Product } from '@/mocks/products';
import { delay } from '@/mocks/delay';

let productDb: Product[] = [...PRODUCTS];

export interface ProductListQuery {
  search?: string;
  category?: string;
}

export interface ProductInput {
  sku: string;
  name: string;
  category: string;
  unit: string;
  salePrice: number;
  costPrice: number;
  safetyStock: number;
  imageUrl?: string;
}

export async function listProducts(query: ProductListQuery): Promise<Product[]> {
  await delay();
  let items = [...productDb];
  if (query.search) {
    const keyword = query.search.trim().toLowerCase();
    items = items.filter((p) => p.name.toLowerCase().includes(keyword) || p.sku.toLowerCase().includes(keyword));
  }
  if (query.category) {
    items = items.filter((p) => p.category === query.category);
  }
  return items;
}

export async function getProduct(id: string): Promise<Product | undefined> {
  await delay(250);
  return productDb.find((p) => p.id === id);
}

export async function createProduct(input: ProductInput): Promise<Product> {
  await delay(400);
  const product: Product = { id: `product-${Date.now()}`, isActive: true, ...input };
  productDb = [product, ...productDb];
  return product;
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product> {
  await delay(400);
  productDb = productDb.map((p) => (p.id === id ? { ...p, ...input } : p));
  const updated = productDb.find((p) => p.id === id);
  if (!updated) throw new Error('제품을 찾을 수 없습니다.');
  return updated;
}

export async function toggleProductActive(id: string): Promise<Product> {
  await delay(350);
  productDb = productDb.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p));
  const updated = productDb.find((p) => p.id === id);
  if (!updated) throw new Error('제품을 찾을 수 없습니다.');
  return updated;
}
