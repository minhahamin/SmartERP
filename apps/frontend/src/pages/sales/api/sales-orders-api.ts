import { apiClient, type ApiSuccess } from '@/lib/api/client';

export type SalesOrderStatus = 'QUOTE' | 'CONFIRMED' | 'SHIPPED' | 'INVOICED' | 'CANCELLED';

export interface SalesOrderItem {
  id: string;
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface SalesOrder {
  id: string;
  orderNo: string;
  partnerId: string;
  partnerName: string;
  orderDate: string;
  status: SalesOrderStatus;
  totalAmount: number;
  items: SalesOrderItem[];
}

interface RawSalesOrder {
  id: string;
  orderNo: string;
  partnerId: string;
  orderDate: string;
  status: SalesOrderStatus;
  totalAmount: string | number;
  partner: { name: string };
  items: {
    id: string;
    productId: string;
    quantity: number;
    unitPrice: string | number;
    amount: string | number;
    product: { name: string; unit: string };
  }[];
}

function toSalesOrder(raw: RawSalesOrder): SalesOrder {
  return {
    id: raw.id,
    orderNo: raw.orderNo,
    partnerId: raw.partnerId,
    partnerName: raw.partner.name,
    orderDate: raw.orderDate,
    status: raw.status,
    totalAmount: Number(raw.totalAmount),
    items: raw.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.product.name,
      unit: i.product.unit,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      amount: Number(i.amount),
    })),
  };
}

export interface SalesOrderListQuery {
  partnerId?: string;
  status?: SalesOrderStatus;
  search?: string;
}

export async function listSalesOrders(query: SalesOrderListQuery): Promise<SalesOrder[]> {
  const { data } = await apiClient.get<ApiSuccess<RawSalesOrder[]>>('/sales-orders', {
    params: { ...query, page: 1, limit: 100 },
  });
  return data.data.map(toSalesOrder);
}

export interface CreateSalesOrderItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateSalesOrderInput {
  partnerId: string;
  orderDate: string;
  items: CreateSalesOrderItemInput[];
}

export async function createSalesOrder(input: CreateSalesOrderInput): Promise<SalesOrder> {
  const { data } = await apiClient.post<ApiSuccess<RawSalesOrder>>('/sales-orders', input);
  return toSalesOrder(data.data);
}

export async function updateSalesOrderStatus(id: string, status: SalesOrderStatus): Promise<SalesOrder> {
  const { data } = await apiClient.patch<ApiSuccess<RawSalesOrder>>(`/sales-orders/${id}/status`, { status });
  return toSalesOrder(data.data);
}
