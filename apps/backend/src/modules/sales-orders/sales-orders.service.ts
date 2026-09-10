import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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
