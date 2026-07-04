import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/interfaces/paginated-result.interface';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateSalesOrderDto } from './dto/sales-order.dto';
import { SalesOrderQueryDto } from './dto/sales-order-query.dto';
import { UpdateSalesOrderStatusDto } from './dto/update-sales-order-status.dto';

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
    const orderNo = await this.nextOrderNo(requester.companyId);
    const items = dto.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.quantity * item.unitPrice,
    }));
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

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
  }

  async updateStatus(id: string, dto: UpdateSalesOrderStatusDto, requester: AuthUser) {
    await this.findOne(id, requester);
    return this.prisma.salesOrder.update({
      where: { id },
      data: { status: dto.status },
      include: INCLUDE,
    });
  }

  private async nextOrderNo(companyId: string): Promise<string> {
    const count = await this.prisma.salesOrder.count({ where: { companyId } });
    return `SO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
}
