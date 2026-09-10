import { Injectable, NotFoundException } from '@nestjs/common';
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

    // belowSafetyStock은 quantity <= product.safetyStock 비교가 필요해 Prisma where로
    // 직접 표현이 안 되므로 범위를 창고/테넌트로 좁혀 최대 5000건까지만 읽고 메모리 필터한다.
    const capped = query.belowSafetyStock ? { skip: 0, take: 5000 } : { skip: (query.page - 1) * query.limit, take: query.limit };
    let items = await this.prisma.inventory.findMany({
      where,
      include: { product: true, warehouse: true },
      orderBy: { updatedAt: 'desc' },
      ...capped,
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
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, companyId: requester.companyId },
      select: { id: true },
    });
    if (!warehouse) throw new NotFoundException('소속 회사의 창고가 아닙니다.');
    const ownedProducts = await this.prisma.product.findMany({
      where: { id: { in: dto.items.map((i) => i.productId) }, companyId: requester.companyId },
      select: { id: true },
    });
    if (ownedProducts.length !== new Set(dto.items.map((i) => i.productId)).size) {
      throw new NotFoundException('소속 회사의 제품이 아닌 품목이 포함되어 있습니다.');
    }    const beforeMap = new Map(
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
