import { PurchaseOrdersService, calcOrderQuantity, groupBySupplier } from './purchase-orders.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

const admin: AuthUser = {
  sub: 'admin-1',
  companyId: 'company-1',
  roleId: 'role-admin',
  roleName: 'ADMIN',
  departmentId: null,
};

describe('발주 수량·그룹 계산', () => {
  it('목표 재고(안전재고의 2배)에서 현재고를 뺀 만큼 주문하고 최소 1개는 주문한다', () => {
    expect(calcOrderQuantity(3, 10)).toBe(17);
    expect(calcOrderQuantity(0, 5)).toBe(10);
    expect(calcOrderQuantity(30, 10)).toBe(1);
  });

  it('공급처별로 묶고 공급처가 없는 품목은 null 그룹으로 모은다', () => {
    const groups = groupBySupplier([
      { supplierId: 'a', id: 1 },
      { supplierId: null, id: 2 },
      { supplierId: 'a', id: 3 },
    ]);
    expect(groups.get('a')?.map((i) => i.id)).toEqual([1, 3]);
    expect(groups.get(null)?.map((i) => i.id)).toEqual([2]);
  });
});

function build(orderOverrides: Record<string, unknown> = {}) {
  const order = {
    id: 'po-1',
    companyId: 'company-1',
    orderNo: 'PO-20261029-001',
    partnerId: 'partner-1',
    status: 'DRAFT',
    items: [{ id: 'item-1', productId: 'p1', quantity: 5 }],
    ...orderOverrides,
  };
  const tx = {
    purchaseOrder: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    inventory: { upsert: jest.fn() },
    stockMovement: { create: jest.fn() },
  };
  const prisma = {
    purchaseOrder: {
      findFirst: jest.fn().mockResolvedValue(order),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'new-po', orderNo: data.orderNo })),
      count: jest.fn().mockResolvedValue(0),
    },
    purchaseOrderItem: { findMany: jest.fn().mockResolvedValue([]) },
    product: { findMany: jest.fn().mockResolvedValue([]) },
    partner: { findFirst: jest.fn().mockResolvedValue(null) },
    warehouse: { findFirst: jest.fn().mockResolvedValue({ id: 'wh-1' }) },
    $transaction: jest.fn().mockImplementation((arg) => (typeof arg === 'function' ? arg(tx) : Promise.all(arg))),
  };
  const jobLock = {
    runExclusive: jest.fn().mockImplementation(async (_name: string, fn: () => Promise<unknown>) => ({
      ran: true,
      result: await fn(),
    })),
  };
  const notifier = { notifyRoles: jest.fn().mockResolvedValue(1) };
  const service = new PurchaseOrdersService(prisma as never, jobLock as never, notifier as never);
  return { service, prisma, tx, jobLock, notifier };
}

const product = (id: string, safetyStock: number, stock: number, supplierId: string | null) => ({
  id,
  supplierId,
  costPrice: 1000,
  safetyStock,
  inventories: [{ quantity: stock }],
});

describe('PurchaseOrdersService — 초안 생성', () => {
  it('안전재고 미달 품목만 공급처별 초안으로 만들고 관리자에게 알린다', async () => {
    const { service, prisma, notifier } = build();
    prisma.product.findMany.mockResolvedValue([
      product('low-a', 10, 3, 'vendor-a'),
      product('low-b', 10, 0, 'vendor-a'),
      product('low-none', 4, 1, null),
      product('ok', 10, 12, 'vendor-a'),
    ]);

    const result = (await service.generateDraftsForCompany('company-1')) as { created: number };
    expect(result.created).toBe(2);
    const calls = prisma.purchaseOrder.create.mock.calls.map((c) => c[0].data);
    const vendorA = calls.find((d) => d.partnerId === 'vendor-a');
    expect(vendorA.items.create.map((i: { productId: string }) => i.productId)).toEqual(['low-a', 'low-b']);
    expect(vendorA.items.create[0]).toMatchObject({ quantity: 17, reason: '현재고 3 / 안전재고 10' });
    expect(calls.find((d) => d.partnerId === null).memo).toContain('공급처');
    expect(notifier.notifyRoles).toHaveBeenCalledWith('company-1', ['ADMIN'], expect.objectContaining({ type: 'PURCHASE_DRAFT' }));
  });

  it('이미 초안·확정 발주에 들어 있는 품목은 다시 만들지 않는다', async () => {
    const { service, prisma, notifier } = build();
    prisma.product.findMany.mockResolvedValue([product('low-a', 10, 3, 'vendor-a')]);
    prisma.purchaseOrderItem.findMany.mockResolvedValue([{ productId: 'low-a' }]);

    const result = (await service.generateDraftsForCompany('company-1')) as { created: number };
    expect(result.created).toBe(0);
    expect(prisma.purchaseOrder.create).not.toHaveBeenCalled();
    expect(notifier.notifyRoles).not.toHaveBeenCalled();
  });

  it('락을 못 잡으면(다른 인스턴스가 실행 중) 아무것도 만들지 않는다', async () => {
    const { service, prisma, jobLock } = build();
    jobLock.runExclusive.mockResolvedValue({ ran: false });
    expect(await service.generateDraftsForCompany('company-1')).toMatchObject({ skipped: true });
    expect(prisma.product.findMany).not.toHaveBeenCalled();
  });
});

describe('PurchaseOrdersService — 확정·입고', () => {
  it('공급처가 없으면 확정할 수 없다', async () => {
    const { service, prisma } = build({ partnerId: null });
    await expect(service.confirm('po-1', admin)).rejects.toMatchObject({ response: { code: 'PURCHASE_PARTNER_REQUIRED' } });
    expect(prisma.purchaseOrder.updateMany).not.toHaveBeenCalled();
  });

  it('초안만 확정할 수 있고, 확정은 상태 조건을 걸어 한 번만 적용된다', async () => {
    const confirmed = build({ status: 'CONFIRMED' });
    await expect(confirmed.service.confirm('po-1', admin)).rejects.toMatchObject({ response: { code: 'PURCHASE_STATE_CONFLICT' } });

    const raced = build();
    raced.prisma.purchaseOrder.updateMany.mockResolvedValue({ count: 0 });
    await expect(raced.service.confirm('po-1', admin)).rejects.toMatchObject({ response: { code: 'PURCHASE_STATE_CONFLICT' } });
  });

  it('입고하면 재고를 늘리고 입고 이력을 남기며, 확정되지 않은 발주는 입고할 수 없다', async () => {
    const { service, tx } = build({ status: 'CONFIRMED' });
    await service.receive('po-1', { warehouseId: 'wh-1' }, admin);
    expect(tx.inventory.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { quantity: { increment: 5 } } }),
    );
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'IN', refType: 'PURCHASE', refId: 'po-1', quantity: 5, createdBy: 'admin-1' }),
    });

    const draft = build();
    await expect(draft.service.receive('po-1', { warehouseId: 'wh-1' }, admin)).rejects.toMatchObject({
      response: { code: 'PURCHASE_STATE_CONFLICT' },
    });
    expect(draft.tx.inventory.upsert).not.toHaveBeenCalled();
  });

  it('공급처로 지정할 수 없는 거래처(고객사)는 거부한다', async () => {
    const { service } = build();
    await expect(service.update('po-1', { partnerId: '00000000-0000-0000-0000-000000000001' }, admin)).rejects.toMatchObject({
      response: { code: 'PARTNER_NOT_VENDOR' },
    });
  });
});
