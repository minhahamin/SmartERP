import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PolicyService } from '../../common/services/policy.service';
import { paginate } from '../../common/interfaces/paginated-result.interface';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateProductionOrderDto } from './dto/production-order.dto';
import { ProductionOrderQueryDto } from './dto/production-order-query.dto';
import { UpdateProductionStatusDto } from './dto/update-production-status.dto';

const FULL_ACCESS_ROLES = ['ADMIN'];

@Injectable()
export class ProductionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  /** docs/02 2.2 — EMPLOYEE는 "CRUD(own 작업)"이므로 본인이 담당자인 오더만 조회 */
  async findAll(query: ProductionOrderQueryDto, requester: AuthUser) {
    const where: Record<string, unknown> = { companyId: requester.companyId };
    if (requester.roleName === 'EMPLOYEE') where.managerId = requester.sub;
    if (query.status) where.status = query.status;
    if (query.delayed) {
      where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
      where.dueDate = { lt: new Date() };
    }

    const [items, total] = await Promise.all([
      this.prisma.productionOrder.findMany({
        where,
        include: { product: true },
        orderBy: { dueDate: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.productionOrder.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  async findOne(id: string, requester: AuthUser) {
    const order = await this.prisma.productionOrder.findFirst({ where: { id, companyId: requester.companyId } });
    if (!order) throw new NotFoundException('생산 오더를 찾을 수 없습니다.');
    return order;
  }

  async create(dto: CreateProductionOrderDto, requester: AuthUser) {
    const orderNo = await this.nextOrderNo(requester.companyId);
    return this.prisma.productionOrder.create({
      data: {
        ...dto,
        companyId: requester.companyId,
        startDate: new Date(dto.startDate),
        dueDate: new Date(dto.dueDate),
        orderNo,
        managerId: requester.roleName === 'ADMIN' ? dto.managerId : requester.sub,
      },
    });
  }

  /** docs/08.4.4 — 상태 변경(완료 시 입고 자동 생성) */
  async updateStatus(id: string, dto: UpdateProductionStatusDto, requester: AuthUser) {
    const order = await this.findOne(id, requester);
    this.policy.assertOwnerOrRole(requester, order.managerId ?? '', FULL_ACCESS_ROLES);

    if (dto.status === 'COMPLETED') {
      if (!order.warehouseId) throw new BadRequestException('완료 처리하려면 입고 창고를 먼저 지정해야 합니다.');
      const producedQty = dto.producedQty ?? order.plannedQty;

      return this.prisma.$transaction(async (tx) => {
        await tx.inventory.upsert({
          where: { productId_warehouseId: { productId: order.productId, warehouseId: order.warehouseId! } },
          create: { productId: order.productId, warehouseId: order.warehouseId!, quantity: producedQty },
          update: { quantity: { increment: producedQty } },
        });
        await tx.stockMovement.create({
          data: {
            productId: order.productId,
            warehouseId: order.warehouseId!,
            type: 'IN',
            quantity: producedQty,
            refType: 'PRODUCTION',
            refId: order.id,
            createdBy: requester.sub,
          },
        });
        return tx.productionOrder.update({ where: { id }, data: { status: 'COMPLETED', producedQty } });
      });
    }

    return this.prisma.productionOrder.update({
      where: { id },
      data: { status: dto.status, ...(dto.producedQty !== undefined ? { producedQty: dto.producedQty } : {}) },
    });
  }

  private async nextOrderNo(companyId: string): Promise<string> {
    const count = await this.prisma.productionOrder.count({ where: { companyId } });
    return `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
}
