import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { paginate } from '../../common/interfaces/paginated-result.interface';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateSalesOrderDto } from './dto/sales-order.dto';
import { SalesOrderQueryDto } from './dto/sales-order-query.dto';
import { UpdateSalesOrderStatusDto } from './dto/update-sales-order-status.dto';
import { retryOnDuplicate } from '../../common/utils/retry-on-duplicate';

const INCLUDE = { partner: true, items: { include: { product: true } } };

@Injectable()
export class SalesOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: SalesOrderQueryDto, requester: AuthUser) {
    const where: Record<string, unknown> = { companyId: requester.companyId };
    if (query.partnerId) where.partnerId = query.partnerId;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { orderNo: { contains: query.search, mode: 'insensitive' } },
        { partner: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where,
        include: INCLUDE,
        orderBy: { orderDate: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.salesOrder.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  async findOne(id: string, requester: AuthUser) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, companyId: requester.companyId },
      include: INCLUDE,
    });
    if (!order) throw new NotFoundException('영업 주문을 찾을 수 없습니다.');
    return order;
  }

  async create(dto: CreateSalesOrderDto, requester: AuthUser) {
    const partner = await this.prisma.partner.findFirst({
      where: { id: dto.partnerId, companyId: requester.companyId },
      select: { id: true },
    });
    if (!partner) throw new NotFoundException('거래처를 찾을 수 없습니다.');
    if (dto.items.length === 0) throw new BadRequestException('주문 품목이 없습니다.');
    const productIds = dto.items.map((i) => i.productId);
    const ownedProducts = await this.prisma.product.findMany({
      where: { id: { in: productIds }, companyId: requester.companyId },
      select: { id: true },
    });
    if (ownedProducts.length !== new Set(productIds).size) {
      throw new NotFoundException('소속 회사의 제품이 아닌 품목이 포함되어 있습니다.');
    }
    const items = dto.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.quantity * item.unitPrice,
    }));
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    // 주문번호 count()+1 경합 시 P2002 재시도 (필터에서 409로 매핑되나 정상 요청은 성공시켜야 함)
    return retryOnDuplicate(async () => {
      const orderNo = await this.nextOrderNo(requester.companyId);
      return this.prisma.salesOrder.create({
        data: {
          companyId: requester.companyId,
          orderNo,
          partnerId: dto.partnerId,
          orderDate: new Date(dto.orderDate),
          totalAmount,
          createdBy: requester.sub,
          items: { create: items },
        },
        include: INCLUDE,
      });
    });
  }

  async updateStatus(id: string, dto: UpdateSalesOrderStatusDto, requester: AuthUser) {
    const order = await this.findOne(id, requester);
    // SHIPPED 전이는 재고 차감과 하나의 트랜잭션으로 묶는다 — 상태만 바뀌고 재고가 그대로인 불일치 방지
    if (dto.status === 'SHIPPED' && order.status !== 'SHIPPED') {
      return this.shipWithStockDeduction(order, requester);
    }
    return this.prisma.salesOrder.update({
      where: { id },
      data: { status: dto.status },
      include: INCLUDE,
    });
  }

  /**
   * 출고 처리 — 조건부 상태 선점 + 품목별 재고 차감을 Serializable 트랜잭션으로 묶는다.
   * - 동시 SHIPPED 경합은 선점 1건만 차감, 패자는 현재 행 반환 (이중 차감 방지)
   * - SHIPPED→CANCELLED→SHIPPED 반복 시 기존 SALES 출고 기록이 있으면 차감 생략 (중복 차감 방지)
   * - 회사 창고 보유량 기준 내림차순으로 차감, 부족 시 409
   */
  private async shipWithStockDeduction(
    order: Awaited<ReturnType<SalesOrdersService['findOne']>>,
    requester: AuthUser,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const claimed = await tx.salesOrder.updateMany({
          where: { id: order.id, companyId: requester.companyId, status: { not: 'SHIPPED' } },
          data: { status: 'SHIPPED' },
        });
        if (claimed.count === 0) {
          return tx.salesOrder.findUniqueOrThrow({ where: { id: order.id }, include: INCLUDE });
        }
        const alreadyDeducted = await tx.stockMovement.findFirst({
          where: { refType: 'SALES', refId: order.id, type: 'OUT' },
        });
        if (!alreadyDeducted) {
          for (const item of order.items) {
            await this.deductItemStock(tx, order.id, item.productId, item.quantity, requester);
          }
        }
        return tx.salesOrder.findUniqueOrThrow({ where: { id: order.id }, include: INCLUDE });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async deductItemStock(
    tx: Prisma.TransactionClient,
    orderId: string,
    productId: string,
    quantity: number,
    requester: AuthUser,
  ): Promise<void> {
    const stocks = await tx.inventory.findMany({
      where: { productId, warehouse: { companyId: requester.companyId } },
      orderBy: { quantity: 'desc' },
    });
    let remaining = quantity;
    for (const stock of stocks) {
      if (remaining <= 0) break;
      const take = Math.min(stock.quantity, remaining);
      if (take <= 0) continue;
      await tx.inventory.update({
        where: { productId_warehouseId: { productId, warehouseId: stock.warehouseId } },
        data: { quantity: { decrement: take } },
      });
      await tx.stockMovement.create({
        data: {
          productId,
          warehouseId: stock.warehouseId,
          type: 'OUT',
          quantity: take,
          refType: 'SALES',
          refId: orderId,
          createdBy: requester.sub,
        },
      });
      remaining -= take;
    }
    if (remaining > 0) {
      throw new AppException('STOCK_INSUFFICIENT', '재고가 부족해 출고할 수 없습니다.', 409);
    }
  }

  private async nextOrderNo(companyId: string): Promise<string> {
    const count = await this.prisma.salesOrder.count({ where: { companyId } });
    return `SO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
}
