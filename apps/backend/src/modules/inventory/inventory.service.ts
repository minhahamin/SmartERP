import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/interfaces/paginated-result.interface';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { StockTakeDto } from './dto/stock-take.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: InventoryQueryDto, requester: AuthUser) {
    const where: Record<string, unknown> = { product: { companyId: requester.companyId } };
    if (query.warehouseId) where.warehouseId = query.warehouseId;

    let items = await this.prisma.inventory.findMany({
      where,
      include: { product: true, warehouse: true },
      orderBy: { updatedAt: 'desc' },
    });

    if (query.belowSafetyStock) {
      items = items.filter((item) => item.quantity <= item.product.safetyStock);
    }

    const total = items.length;
    const paged = items.slice((query.page - 1) * query.limit, (query.page - 1) * query.limit + query.limit);
    return paginate(paged, total, query.page, query.limit);
  }

  /** docs/08.4.4 — 재고 실사 확정: 실사 수량과 시스템 수량의 차이를 ADJUST StockMovement로 기록하고 Inventory를 갱신한다 */
  async stockTake(dto: StockTakeDto, requester: AuthUser) {
    const beforeMap = new Map(
      (
        await this.prisma.inventory.findMany({
          where: { warehouseId: dto.warehouseId, productId: { in: dto.items.map((i) => i.productId) } },
        })
      ).map((inv) => [inv.productId, inv.quantity]),
    );

    const operations = dto.items.flatMap((item) => {
      const before = beforeMap.get(item.productId) ?? 0;
      const upsert = this.prisma.inventory.upsert({
        where: { productId_warehouseId: { productId: item.productId, warehouseId: dto.warehouseId } },
        create: { productId: item.productId, warehouseId: dto.warehouseId, quantity: item.actualQuantity },
        update: { quantity: item.actualQuantity },
      });
      if (before === item.actualQuantity) return [upsert];

      const adjustment = this.prisma.stockMovement.create({
        data: {
          productId: item.productId,
          warehouseId: dto.warehouseId,
          type: 'ADJUST',
          quantity: item.actualQuantity - before,
          refType: 'ADJUSTMENT',
          memo: '재고 실사 확정',
          createdBy: requester.sub,
        },
      });
      return [upsert, adjustment];
    });

    return this.prisma.$transaction(operations);
  }
}
