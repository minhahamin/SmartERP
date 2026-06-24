import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(requester: AuthUser) {
    return this.prisma.warehouse.findMany({ where: { companyId: requester.companyId }, orderBy: { name: 'asc' } });
  }

  async findOne(id: string, requester: AuthUser) {
    const warehouse = await this.prisma.warehouse.findFirst({ where: { id, companyId: requester.companyId } });
    if (!warehouse) throw new NotFoundException('창고를 찾을 수 없습니다.');
    return warehouse;
  }

  create(dto: CreateWarehouseDto, requester: AuthUser) {
    return this.prisma.warehouse.create({ data: { ...dto, companyId: requester.companyId } });
  }

  async update(id: string, dto: UpdateWarehouseDto, requester: AuthUser) {
    await this.findOne(id, requester);
    return this.prisma.warehouse.update({ where: { id }, data: dto });
  }

  /** 재고가 남아있는 창고, 또는 회사의 마지막 창고는 삭제할 수 없다 */
  async remove(id: string, requester: AuthUser) {
    await this.findOne(id, requester);

    const [warehouseCount, stockedCount] = await Promise.all([
      this.prisma.warehouse.count({ where: { companyId: requester.companyId } }),
      this.prisma.inventory.count({ where: { warehouseId: id, quantity: { gt: 0 } } }),
    ]);
    if (warehouseCount <= 1) throw new BadRequestException('최소 1개의 창고가 있어야 합니다.');
    if (stockedCount > 0) throw new BadRequestException('재고가 남아있는 창고는 삭제할 수 없습니다.');

    await this.prisma.warehouse.delete({ where: { id } });
    return { success: true };
  }
}
