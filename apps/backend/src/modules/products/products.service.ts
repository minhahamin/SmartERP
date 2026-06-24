import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/interfaces/paginated-result.interface';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateProductDto, PRICE_FIELDS, UpdateProductDto } from './dto/product.dto';
import { ProductQueryDto } from './dto/product-query.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ProductQueryDto, requester: AuthUser) {
    const where: Record<string, unknown> = { companyId: requester.companyId };
    if (query.category) where.category = query.category;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  async findOne(id: string, requester: AuthUser) {
    const product = await this.prisma.product.findFirst({ where: { id, companyId: requester.companyId } });
    if (!product) throw new NotFoundException('제품을 찾을 수 없습니다.');
    return product;
  }

  create(dto: CreateProductDto, requester: AuthUser) {
    return this.prisma.product.create({ data: { ...dto, companyId: requester.companyId } });
  }

  async update(id: string, dto: UpdateProductDto, requester: AuthUser) {
    await this.findOne(id, requester);
    const data = { ...dto };
    if (requester.roleName === 'SALES_MANAGER') {
      for (const field of PRICE_FIELDS) delete data[field];
    }
    return this.prisma.product.update({ where: { id }, data });
  }

  async remove(id: string, requester: AuthUser) {
    await this.findOne(id, requester);
    const stockCount = await this.prisma.inventory.count({ where: { productId: id, quantity: { gt: 0 } } });
    if (stockCount > 0) throw new BadRequestException('재고가 남아있는 제품은 삭제할 수 없습니다.');

    await this.prisma.product.delete({ where: { id } });
    return { success: true };
  }
}
