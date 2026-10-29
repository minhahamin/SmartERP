import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { paginate } from '../../common/interfaces/paginated-result.interface';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { retryOnDuplicate } from '../../common/utils/retry-on-duplicate';
import { JobLockService } from '../../common/services/job-lock.service';
import { NotifierService } from '../../common/services/notifier.service';
import { PurchaseOrderQueryDto, ReceivePurchaseOrderDto, UpdatePurchaseOrderDto } from './dto/purchase-order.dto';

/** 발주 목표 재고 = 안전재고의 이 배수. 안전재고에 겨우 맞추면 다음 날 또 부족해지므로 여유를 둔다 */
export const TARGET_STOCK_MULTIPLIER = 2;

export interface ShortageProduct {
  productId: string;
  supplierId: string | null;
  costPrice: number;
  currentStock: number;
  safetyStock: number;
}

/** 부족 수량 = 목표 재고 − 현재고. 순수 함수라 DB 없이 테스트한다 */
export function calcOrderQuantity(currentStock: number, safetyStock: number): number {
  return Math.max(1, safetyStock * TARGET_STOCK_MULTIPLIER - currentStock);
}

/** 공급처별로 한 장씩 묶는다. 공급처가 없는 품목은 null 키로 모여 사람이 공급처를 고르게 한다 */
export function groupBySupplier<T extends { supplierId: string | null }>(items: T[]): Map<string | null, T[]> {
  const groups = new Map<string | null, T[]>();
  for (const item of items) {
    const group = groups.get(item.supplierId) ?? [];
    group.push(item);
    groups.set(item.supplierId, group);
  }
  return groups;
}

const OPEN_STATUSES = ['DRAFT', 'CONFIRMED'] as const;

/**
 * 안전재고 미달 품목으로 발주 초안을 만든다. 시스템은 DRAFT까지만 만들고, 사람이 공급처·수량을 확인해
 * 확정(CONFIRMED)해야 하며, 입고(RECEIVED) 처리 때 비로소 재고가 늘어난다.
 */
@Injectable()
export class PurchaseOrdersService {
  private readonly logger = new Logger(PurchaseOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobLock: JobLockService,
    private readonly notifier: NotifierService,
  ) {}

  async findAll(query: PurchaseOrderQueryDto, requester: AuthUser) {
    const where: Prisma.PurchaseOrderWhereInput = {
      companyId: requester.companyId,
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: { partner: true, items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  async findOne(id: string, requester: AuthUser) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId: requester.companyId },
      include: { partner: true, items: { include: { product: true } } },
    });
    if (!order) throw new AppException('PURCHASE_ORDER_NOT_FOUND', '발주서를 찾을 수 없습니다.', 404);
    return order;
  }

  /** 수동 실행(관리자가 버튼으로)도 자동 실행과 같은 경로를 쓴다 */
  async generateDraftsForCompany(companyId: string, actorId?: string) {
    const run = await this.jobLock.runExclusive(`purchase-drafts:${companyId}`, () =>
      this.createDrafts(companyId, actorId),
    );
    if (!run.ran) return { skipped: true as const, reason: '다른 곳에서 이미 실행 중입니다.' };
    return run.result;
  }

  private async findShortages(companyId: string): Promise<ShortageProduct[]> {
    const [products, openItems] = await Promise.all([
      this.prisma.product.findMany({
        where: { companyId, isActive: true, safetyStock: { gt: 0 } },
        select: {
          id: true,
          supplierId: true,
          costPrice: true,
          safetyStock: true,
          inventories: { select: { quantity: true } },
        },
      }),
      // 이미 진행 중인 발주(초안·확정)에 들어 있는 품목은 입고 전까지 다시 만들지 않는다
      this.prisma.purchaseOrderItem.findMany({
        where: { purchaseOrder: { companyId, status: { in: [...OPEN_STATUSES] } } },
        select: { productId: true },
      }),
    ]);
    const covered = new Set(openItems.map((i) => i.productId));
    return products
      .map((p) => ({
        productId: p.id,
        supplierId: p.supplierId,
        costPrice: Number(p.costPrice),
        safetyStock: p.safetyStock,
        currentStock: p.inventories.reduce((sum, inv) => sum + inv.quantity, 0),
      }))
      .filter((p) => p.currentStock < p.safetyStock && !covered.has(p.productId));
  }

  private async createDrafts(companyId: string, actorId?: string) {
    const shortages = await this.findShortages(companyId);
    if (shortages.length === 0) return { created: 0, orders: [] as { id: string; orderNo: string }[] };

    const orders: { id: string; orderNo: string }[] = [];
    for (const [supplierId, group] of groupBySupplier(shortages)) {
      const order = await retryOnDuplicate(async () => {
        const orderNo = await this.nextOrderNo(companyId);
        return this.prisma.purchaseOrder.create({
          data: {
            companyId,
            orderNo,
            partnerId: supplierId,
            isAutoGenerated: true,
            memo: supplierId ? null : '공급처가 지정되지 않은 품목입니다. 공급처를 선택한 뒤 확정하세요.',
            items: {
              create: group.map((p) => ({
                productId: p.productId,
                quantity: calcOrderQuantity(p.currentStock, p.safetyStock),
                unitCost: p.costPrice,
                reason: `현재고 ${p.currentStock} / 안전재고 ${p.safetyStock}`,
              })),
            },
          },
        });
      });
      orders.push({ id: order.id, orderNo: order.orderNo });
    }

    await this.notifier.notifyRoles(companyId, ['ADMIN'], {
      type: 'PURCHASE_DRAFT',
      title: `발주 초안 ${orders.length}건이 만들어졌습니다`,
      message: `안전재고 미달 ${shortages.length}개 품목에 대한 발주 초안입니다. 공급처와 수량을 확인하고 확정해주세요.`,
      link: '/purchase-orders',
      dedupeKey: `purchase-draft:${orders[0].id}`,
    });
    this.logger.log(`발주 초안 생성 company=${companyId} orders=${orders.length} by=${actorId ?? 'system'}`);
    return { created: orders.length, orders };
  }

  private async nextOrderNo(companyId: string): Promise<string> {
    const kst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `PO-${kst}-`;
    const count = await this.prisma.purchaseOrder.count({ where: { companyId, orderNo: { startsWith: prefix } } });
    return `${prefix}${String(count + 1).padStart(3, '0')}`;
  }

  async update(id: string, dto: UpdatePurchaseOrderDto, requester: AuthUser) {
    const order = await this.findOne(id, requester);
    this.assertStatus(order.status, 'DRAFT', '초안 상태에서만 수정할 수 있습니다.');

    if (dto.partnerId) {
      const partner = await this.prisma.partner.findFirst({
        where: { id: dto.partnerId, companyId: requester.companyId, type: { in: ['VENDOR', 'BOTH'] } },
        select: { id: true },
      });
      if (!partner) throw new AppException('PARTNER_NOT_VENDOR', '공급처로 지정할 수 있는 거래처가 아닙니다.', 400);
    }
    const itemIds = new Set(order.items.map((i) => i.id));
    if (dto.items?.some((i) => !itemIds.has(i.itemId))) {
      throw new AppException('PURCHASE_ITEM_NOT_FOUND', '이 발주서의 품목이 아닙니다.', 400);
    }

    await this.prisma.$transaction([
      this.prisma.purchaseOrder.update({
        where: { id },
        data: { partnerId: dto.partnerId ?? undefined, memo: dto.memo ?? undefined },
      }),
      ...(dto.items ?? []).map((i) =>
        this.prisma.purchaseOrderItem.update({ where: { id: i.itemId }, data: { quantity: i.quantity } }),
      ),
    ]);
    return this.findOne(id, requester);
  }

  async confirm(id: string, requester: AuthUser) {
    const order = await this.findOne(id, requester);
    this.assertStatus(order.status, 'DRAFT', '초안 상태에서만 확정할 수 있습니다.');
    if (!order.partnerId) {
      throw new AppException('PURCHASE_PARTNER_REQUIRED', '공급처를 선택한 뒤 확정해주세요.', 400);
    }
    if (order.items.length === 0) throw new AppException('PURCHASE_EMPTY', '품목이 없는 발주서입니다.', 400);

    // 동시에 두 번 눌러도 한 번만 확정되도록 상태 조건을 걸어 갱신한다
    const { count } = await this.prisma.purchaseOrder.updateMany({
      where: { id, status: 'DRAFT' },
      data: { status: 'CONFIRMED', confirmedAt: new Date(), confirmedBy: requester.sub },
    });
    if (count === 0) throw new AppException('PURCHASE_STATE_CONFLICT', '이미 처리된 발주서입니다.', 409);
    return this.findOne(id, requester);
  }

  async cancel(id: string, requester: AuthUser) {
    const order = await this.findOne(id, requester);
    if (order.status !== 'DRAFT' && order.status !== 'CONFIRMED') {
      throw new AppException('PURCHASE_STATE_CONFLICT', '초안 또는 확정 상태의 발주서만 취소할 수 있습니다.', 409);
    }
    const { count } = await this.prisma.purchaseOrder.updateMany({
      where: { id, status: { in: ['DRAFT', 'CONFIRMED'] } },
      data: { status: 'CANCELLED' },
    });
    if (count === 0) throw new AppException('PURCHASE_STATE_CONFLICT', '이미 처리된 발주서입니다.', 409);
    return this.findOne(id, requester);
  }

  /** 입고: 재고 증가와 입고 이력(StockMovement IN/PURCHASE)을 한 트랜잭션으로 처리한다 */
  async receive(id: string, dto: ReceivePurchaseOrderDto, requester: AuthUser) {
    const order = await this.findOne(id, requester);
    this.assertStatus(order.status, 'CONFIRMED', '확정된 발주서만 입고 처리할 수 있습니다.');
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, companyId: requester.companyId },
      select: { id: true },
    });
    if (!warehouse) throw new AppException('WAREHOUSE_NOT_FOUND', '소속 회사의 창고가 아닙니다.', 404);

    await this.prisma.$transaction(
      async (tx) => {
        const { count } = await tx.purchaseOrder.updateMany({
          where: { id, status: 'CONFIRMED' },
          data: { status: 'RECEIVED', receivedAt: new Date() },
        });
        if (count === 0) throw new AppException('PURCHASE_STATE_CONFLICT', '이미 처리된 발주서입니다.', 409);

        for (const item of order.items) {
          await tx.inventory.upsert({
            where: { productId_warehouseId: { productId: item.productId, warehouseId: dto.warehouseId } },
            create: { productId: item.productId, warehouseId: dto.warehouseId, quantity: item.quantity },
            update: { quantity: { increment: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              warehouseId: dto.warehouseId,
              type: 'IN',
              quantity: item.quantity,
              refType: 'PURCHASE',
              refId: id,
              memo: `발주 입고 ${order.orderNo}`,
              createdBy: requester.sub,
            },
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return this.findOne(id, requester);
  }

  private assertStatus(actual: string, expected: string, message: string) {
    if (actual !== expected) throw new AppException('PURCHASE_STATE_CONFLICT', message, 409);
  }
}
