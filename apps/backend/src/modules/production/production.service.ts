import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { PolicyService } from '../../common/services/policy.service';
import { paginate } from '../../common/interfaces/paginated-result.interface';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateProductionOrderDto } from './dto/production-order.dto';
import { ProductionOrderQueryDto } from './dto/production-order-query.dto';
import { UpdateProductionStatusDto } from './dto/update-production-status.dto';
import { retryOnDuplicate } from '../../common/utils/retry-on-duplicate';

const FULL_ACCESS_ROLES = ['ADMIN'];

const STATUS_LABEL: Record<string, string> = {
  PLANNED: '계획',
  IN_PROGRESS: '진행중',
  DELAYED: '지연',
  COMPLETED: '완료',
  CANCELLED: '취소',
};

@Injectable()
export class ProductionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  private buildWhere(query: ProductionOrderQueryDto, requester: AuthUser): Record<string, unknown> {
    const where: Record<string, unknown> = { companyId: requester.companyId };
    if (requester.roleName === 'EMPLOYEE') where.managerId = requester.sub;
    if (query.status) where.status = query.status;
    if (query.productId) where.productId = query.productId;
    if (query.delayed) {
      where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
      where.dueDate = { lt: new Date() };
    }
    return where;
  }

  /** docs/02 2.2 — EMPLOYEE는 "CRUD(own 작업)"이므로 본인이 담당자인 오더만 조회 */
  async findAll(query: ProductionOrderQueryDto, requester: AuthUser) {
    const where = this.buildWhere(query, requester);
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

  /** 목록 화면과 동일한 필터·스코핑(EMPLOYEE는 본인 담당 오더만)을 그대로 적용해 Excel로 내려받는다 */
  async exportToExcel(query: ProductionOrderQueryDto, requester: AuthUser): Promise<Buffer> {
    const where = this.buildWhere(query, requester);
    // ProductionOrder.managerId는 스키마상 User로의 @relation이 없는 단순 FK라 별도로 조인한다
    const orders = await this.prisma.productionOrder.findMany({
      where,
      include: { product: true },
      orderBy: { dueDate: 'asc' },
    });
    const managerIds = [...new Set(orders.map((o) => o.managerId).filter((id): id is string => Boolean(id)))];
    const managers = await this.prisma.user.findMany({
      where: { id: { in: managerIds } },
      select: { id: true, name: true },
    });
    const managerNameById = new Map(managers.map((m) => [m.id, m.name]));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('생산현황');
    sheet.columns = [
      { header: '오더번호', key: 'orderNo', width: 18 },
      { header: '제품명', key: 'productName', width: 28 },
      { header: '라인', key: 'lineName', width: 12 },
      { header: '계획수량', key: 'plannedQty', width: 12 },
      { header: '생산수량', key: 'producedQty', width: 12 },
      { header: '상태', key: 'status', width: 10 },
      { header: '시작일', key: 'startDate', width: 12 },
      { header: '마감일', key: 'dueDate', width: 12 },
      { header: '담당자', key: 'managerName', width: 12 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const o of orders) {
      sheet.addRow({
        orderNo: o.orderNo,
        productName: o.product.name,
        lineName: o.lineName,
        plannedQty: o.plannedQty,
        producedQty: o.producedQty,
        status: STATUS_LABEL[o.status] ?? o.status,
        startDate: o.startDate.toISOString().slice(0, 10),
        dueDate: o.dueDate.toISOString().slice(0, 10),
        managerName: (o.managerId && managerNameById.get(o.managerId)) || '-',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async findOne(id: string, requester: AuthUser) {
    const order = await this.prisma.productionOrder.findFirst({
      where: { id, companyId: requester.companyId },
    });
    if (!order) throw new NotFoundException('생산 오더를 찾을 수 없습니다.');
    return order;
  }

  async create(dto: CreateProductionOrderDto, requester: AuthUser) {
    return retryOnDuplicate(async () => {
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
    });
  }

  /** docs/08.4.4 — 상태 변경(완료 시 입고 자동 생성) */
  async updateStatus(id: string, dto: UpdateProductionStatusDto, requester: AuthUser) {
    const order = await this.findOne(id, requester);
    this.policy.assertOwnerOrRole(requester, order.managerId ?? '', FULL_ACCESS_ROLES);

    if (dto.status === 'COMPLETED') {
      if (order.status === 'COMPLETED') return order; // 멱등: 중복 완료는 이중 입고 없이 반환
      if (!order.warehouseId)
        throw new BadRequestException('완료 처리하려면 입고 창고를 먼저 지정해야 합니다.');
      const producedQty = dto.producedQty ?? order.plannedQty;

      return this.prisma.$transaction(async (tx) => {
        // 동시 완료 요청 경합 방지: 멱등 체크를 트랜잭션 안 조건부 업데이트로 수행해
        // 승자 1건만 입고를 진행하고, 패자는 이미 COMPLETED인 행을 그대로 반환한다.
        const claimed = await tx.productionOrder.updateMany({
          where: { id, companyId: requester.companyId, status: { not: 'COMPLETED' } },
          data: { status: 'COMPLETED', producedQty },
        });
        if (claimed.count === 0) {
          return tx.productionOrder.findUniqueOrThrow({ where: { id } });
        }
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
        return tx.productionOrder.findUniqueOrThrow({ where: { id } });
      });
    }

    return this.prisma.productionOrder.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.producedQty !== undefined ? { producedQty: dto.producedQty } : {}),
      },
    });
  }

  private async nextOrderNo(companyId: string): Promise<string> {
    const count = await this.prisma.productionOrder.count({ where: { companyId } });
    return `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
}
