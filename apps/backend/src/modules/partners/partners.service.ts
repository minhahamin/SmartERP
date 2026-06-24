import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/interfaces/paginated-result.interface';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreatePartnerDto, UpdatePartnerDto } from './dto/partner.dto';
import { PartnerQueryDto } from './dto/partner-query.dto';

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PartnerQueryDto, requester: AuthUser) {
    const where: Record<string, unknown> = { companyId: requester.companyId };
    if (query.type) where.type = query.type;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { bizRegNo: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.partner.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.partner.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  async findOne(id: string, requester: AuthUser) {
    const partner = await this.prisma.partner.findFirst({ where: { id, companyId: requester.companyId } });
    if (!partner) throw new NotFoundException('거래처를 찾을 수 없습니다.');
    return partner;
  }

  create(dto: CreatePartnerDto, requester: AuthUser) {
    return this.prisma.partner.create({ data: { ...dto, companyId: requester.companyId } });
  }

  async update(id: string, dto: UpdatePartnerDto, requester: AuthUser) {
    await this.findOne(id, requester);
    return this.prisma.partner.update({ where: { id }, data: dto });
  }

  async remove(id: string, requester: AuthUser) {
    await this.findOne(id, requester);
    const orderCount = await this.prisma.salesOrder.count({ where: { partnerId: id } });
    if (orderCount > 0) throw new BadRequestException('주문 이력이 있는 거래처는 삭제할 수 없습니다.');

    await this.prisma.partner.delete({ where: { id } });
    return { success: true };
  }
}
