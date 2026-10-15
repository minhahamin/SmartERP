import { BadRequestException } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { ProductionService } from './production.service';

const admin: AuthUser = {
  sub: 'admin-1',
  companyId: 'company-1',
  roleId: 'role-admin',
  roleName: 'ADMIN',
  departmentId: null,
};

function build(order: Record<string, unknown>) {
  const tx = {
    productionOrder: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ ...order, status: 'COMPLETED' }),
    },
    inventory: { upsert: jest.fn().mockResolvedValue({}) },
    stockMovement: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    productionOrder: {
      findFirst: jest.fn().mockResolvedValue(order),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => Promise.resolve(fn(tx))),
  };
  const policy = { assertOwnerOrRole: jest.fn() };
  const service = new ProductionService(prisma as never, policy as never);
  return { service, prisma, tx };
}

const baseOrder = {
  id: 'po-1',
  companyId: 'company-1',
  productId: 'prod-1',
  warehouseId: 'wh-1',
  plannedQty: 100,
  managerId: 'admin-1',
};

describe('ProductionService.updateStatus — 완료/취소는 되돌릴 수 없다', () => {
  it('완료된 오더를 되돌리면 409로 거부한다(되돌린 뒤 재완료하면 이중 입고되므로)', async () => {
    const { service, prisma, tx } = build({ ...baseOrder, status: 'COMPLETED' });
    await expect(service.updateStatus('po-1', { status: 'IN_PROGRESS' }, admin)).rejects.toMatchObject({
      code: 'PRODUCTION_ALREADY_COMPLETED',
    });
    expect(prisma.productionOrder.updateMany).not.toHaveBeenCalled();
    expect(tx.inventory.upsert).not.toHaveBeenCalled();
  });

  it('취소된 오더를 되살리려 하면 409로 거부한다', async () => {
    const { service } = build({ ...baseOrder, status: 'CANCELLED' });
    await expect(service.updateStatus('po-1', { status: 'PLANNED' }, admin)).rejects.toBeInstanceOf(
      AppException,
    );
  });

  it('이미 완료된 오더를 다시 완료 처리해도 입고는 일어나지 않는다(멱등)', async () => {
    const { service, prisma, tx } = build({ ...baseOrder, status: 'COMPLETED' });
    const result = await service.updateStatus('po-1', { status: 'COMPLETED' }, admin);
    expect(result).toMatchObject({ status: 'COMPLETED' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it('입고 창고가 없으면 완료 처리를 거부한다', async () => {
    const { service } = build({ ...baseOrder, warehouseId: null, status: 'IN_PROGRESS' });
    await expect(service.updateStatus('po-1', { status: 'COMPLETED' }, admin)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('정상 완료는 재고와 입출고 이력을 정확히 한 번만 만든다', async () => {
    const { service, tx } = build({ ...baseOrder, status: 'IN_PROGRESS' });
    await service.updateStatus('po-1', { status: 'COMPLETED' }, admin);
    expect(tx.inventory.upsert).toHaveBeenCalledTimes(1);
    expect(tx.stockMovement.create).toHaveBeenCalledTimes(1);
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'IN', quantity: 100, refType: 'PRODUCTION', refId: 'po-1' }),
    });
  });

  it('진행 중 오더의 일반 상태 변경은 종착 상태가 아닌 행에만 조건부로 적용한다', async () => {
    const { service, prisma } = build({ ...baseOrder, status: 'PLANNED' });
    await service.updateStatus('po-1', { status: 'IN_PROGRESS' }, admin);
    expect(prisma.productionOrder.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { notIn: ['COMPLETED', 'CANCELLED'] } }),
      }),
    );
  });

  it('검사 이후 다른 요청이 먼저 완료했다면(조건부 업데이트 0건) 409로 거부한다', async () => {
    const { service, prisma } = build({ ...baseOrder, status: 'PLANNED' });
    prisma.productionOrder.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.updateStatus('po-1', { status: 'DELAYED' }, admin)).rejects.toMatchObject({
      code: 'PRODUCTION_STATUS_CONFLICT',
    });
  });
});
