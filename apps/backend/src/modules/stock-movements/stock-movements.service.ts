import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { paginate } from '../../common/interfaces/paginated-result.interface';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { StockMovementQueryDto } from './dto/stock-movement-query.dto';

@Injectable()
export class StockMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: StockMovementQueryDto, requester: AuthUser) {
    const where: Record<string, unknown> = { product: { companyId: requester.companyId } };
    if (query.productId) where.productId = query.productId;
    if (query.type) where.type = query.type;
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: { product: true, warehouse: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  /**
   * docs/07 7.6 #4 — StockMovement insert와 Inventory upsert를 하나의 트랜잭션으로 묶고,
   * Serializable 격리수준으로 동시 출고 요청에 의한 음수 재고를 방지한다.
   */
  async create(dto: CreateStockMovementDto, requester: AuthUser) {
    const delta = dto.type === 'OUT' ? -dto.quantity : dto.quantity;

    return this.prisma.$transaction(
      async (tx) => {
        const current = await tx.inventory.findUnique({
          where: { productId_warehouseId: { productId: dto.productId, warehouseId: dto.warehouseId } },
        });
        const nextQuantity = (current?.quantity ?? 0) + delta;
        if (nextQuantity < 0) {
          throw new AppException('STOCK_INSUFFICIENT', '재고가 부족합니다.', 409);
        }

        await tx.inventory.upsert({
          where: { productId_warehouseId: { productId: dto.productId, warehouseId: dto.warehouseId } },
          create: { productId: dto.productId, warehouseId: dto.warehouseId, quantity: nextQuantity },
          update: { quantity: nextQuantity },
        });

        return tx.stockMovement.create({ data: { ...dto, createdBy: requester.sub } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
