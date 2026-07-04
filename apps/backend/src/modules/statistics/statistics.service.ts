import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

export interface ChartPoint {
  label: string;
  value: number;
}

const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

/** apps/frontend/src/types/auth.ts의 ROLE_LABEL과 동일 — 프론트/백엔드가 별도 앱이라 값만 맞춰 중복 정의한다 */
const ROLE_LABEL: Record<string, string> = {
  ADMIN: '관리자',
  HR_MANAGER: '인사 담당자',
  SALES_MANAGER: '영업 담당자',
  EMPLOYEE: '일반 직원',
};
const ROLE_ORDER = ['ADMIN', 'HR_MANAGER', 'SALES_MANAGER', 'EMPLOYEE'];

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** docs/02 2.2 — ADMIN/SALES_MANAGER만 매출 통계 화면 접근 가능 */
  async getSalesCharts(requester: AuthUser) {
    if (requester.roleName !== 'ADMIN' && requester.roleName !== 'SALES_MANAGER') {
      throw new ForbiddenException('매출 통계는 관리자/영업 담당자만 조회할 수 있습니다.');
    }

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const orders = await this.prisma.salesOrder.findMany({
      where: {
        companyId: requester.companyId,
        orderDate: { gte: sixMonthsAgo },
        status: { not: 'CANCELLED' },
      },
      include: { partner: true },
    });

    const monthlyMap = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthlyMap.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
    }
    const partnerMap = new Map<string, number>();
    for (const order of orders) {
      const d = order.orderDate;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (monthlyMap.has(key)) monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Number(order.totalAmount));
      partnerMap.set(
        order.partner.name,
        (partnerMap.get(order.partner.name) ?? 0) + Number(order.totalAmount),
      );
    }

    const monthlyTrend: ChartPoint[] = Array.from(monthlyMap.entries()).map(([key, value]) => {
      const month = Number(key.split('-')[1]);
      return { label: MONTH_LABELS[month], value };
    });
    const byPartner: ChartPoint[] = Array.from(partnerMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { monthlyTrend, byPartner };
  }

  /** docs/02 2.2 — 재고 통계는 ADMIN(전체)만 노출되는 탭이다 */
  async getInventoryCharts(requester: AuthUser) {
    if (requester.roleName !== 'ADMIN') {
      throw new ForbiddenException('재고 통계는 관리자만 조회할 수 있습니다.');
    }

    const inventories = await this.prisma.inventory.findMany({
      where: { product: { companyId: requester.companyId } },
      include: { product: true, warehouse: true },
    });

    const byWarehouseMap = new Map<string, number>();
    const byCategoryMap = new Map<string, number>();
    for (const inv of inventories) {
      byWarehouseMap.set(inv.warehouse.name, (byWarehouseMap.get(inv.warehouse.name) ?? 0) + inv.quantity);
      const category = inv.product.category ?? '미분류';
      byCategoryMap.set(category, (byCategoryMap.get(category) ?? 0) + inv.quantity);
    }

    return {
      byWarehouse: Array.from(byWarehouseMap.entries()).map(([label, value]) => ({ label, value })),
      byCategory: Array.from(byCategoryMap.entries()).map(([label, value]) => ({ label, value })),
    };
  }

  /** docs/02 2.2 — 인사 통계는 ADMIN/HR_MANAGER만 접근 가능 */
  async getHrCharts(requester: AuthUser) {
    if (requester.roleName !== 'ADMIN' && requester.roleName !== 'HR_MANAGER') {
      throw new ForbiddenException('인사 통계는 관리자/인사 담당자만 조회할 수 있습니다.');
    }

    const employees = await this.prisma.user.findMany({
      where: { companyId: requester.companyId, status: 'ACTIVE' },
      include: { department: true, role: true },
    });

    const byDepartmentMap = new Map<string, number>();
    for (const e of employees) {
      const name = e.department?.name ?? '미배정';
      byDepartmentMap.set(name, (byDepartmentMap.get(name) ?? 0) + 1);
    }

    const byRoleMap = new Map<string, number>();
    for (const e of employees) {
      const label = ROLE_LABEL[e.role.name] ?? e.role.name;
      byRoleMap.set(label, (byRoleMap.get(label) ?? 0) + 1);
    }
    const byRole: ChartPoint[] = ROLE_ORDER.map((r) => ({
      label: ROLE_LABEL[r],
      value: byRoleMap.get(ROLE_LABEL[r]) ?? 0,
    })).concat(
      Array.from(byRoleMap.entries())
        .filter(([label]) => !ROLE_ORDER.map((r) => ROLE_LABEL[r]).includes(label))
        .map(([label, value]) => ({ label, value })),
    );

    return {
      byDepartment: Array.from(byDepartmentMap.entries()).map(([label, value]) => ({ label, value })),
      byRole,
    };
  }

  /** 본인 근태/연차 현황 — 전 역할 공통(self-service) */
  async getMyCharts(requester: AuthUser) {
    const year = new Date().getFullYear();
    const [records, leaveBalance] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { userId: requester.sub },
        orderBy: { workDate: 'desc' },
        take: 7,
      }),
      this.prisma.leaveBalance.findUnique({ where: { userId_year: { userId: requester.sub, year } } }),
    ]);

    const attendance: ChartPoint[] = records.reverse().map((r) => ({
      label: r.workDate.toISOString().slice(5, 10),
      value: r.workMinutes ? Math.round((r.workMinutes / 60) * 10) / 10 : 0,
    }));

    return {
      attendance,
      leave: leaveBalance
        ? {
            total: Number(leaveBalance.totalDays),
            used: Number(leaveBalance.usedDays),
            remaining: Number(leaveBalance.remainingDays),
          }
        : { total: 0, used: 0, remaining: 0 },
    };
  }

  /** docs/02 2.2 — 통계 분석: ADMIN=전체, HR_MANAGER=인사, SALES_MANAGER=영업, EMPLOYEE=본인만 */
  async getDashboard(requester: AuthUser) {
    switch (requester.roleName) {
      case 'ADMIN':
        return this.getCompanyWideStats(requester.companyId);
      case 'HR_MANAGER':
        return this.getHrStats(requester.companyId);
      case 'SALES_MANAGER':
        return this.getSalesStats(requester.companyId);
      default:
        return this.getMyStats(requester);
    }
  }

  private async getCompanyWideStats(companyId: string) {
    const now = new Date();
    const [totalEmployees, totalDepartments, lowStockCount, delayedOrderCount, pendingLeaveCount] =
      await Promise.all([
        this.prisma.user.count({ where: { companyId, status: 'ACTIVE' } }),
        this.prisma.department.count({ where: { companyId } }),
        this.countLowStock(companyId),
        this.prisma.productionOrder.count({
          where: { companyId, status: { notIn: ['COMPLETED', 'CANCELLED'] }, dueDate: { lt: now } },
        }),
        this.prisma.leaveRequest.count({ where: { user: { companyId }, status: 'PENDING' } }),
      ]);
    return {
      scope: 'COMPANY',
      totalEmployees,
      totalDepartments,
      lowStockCount,
      delayedOrderCount,
      pendingLeaveCount,
    };
  }

  /** Prisma는 두 컬럼(quantity vs product.safetyStock) 비교를 표준 where로 표현할 수 없어 raw SQL을 사용한다 */
  private async countLowStock(companyId: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM inventories i
      JOIN products p ON p.id = i."productId"
      WHERE p."companyId" = ${companyId} AND i.quantity <= p."safetyStock"
    `;
    return Number(rows[0]?.count ?? 0);
  }

  private async getHrStats(companyId: string) {
    const [totalEmployees, pendingLeaveCount, draftPayrollCount] = await Promise.all([
      this.prisma.user.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.leaveRequest.count({ where: { user: { companyId }, status: 'PENDING' } }),
      this.prisma.payroll.count({ where: { user: { companyId }, status: 'DRAFT' } }),
    ]);
    return { scope: 'HR', totalEmployees, pendingLeaveCount, draftPayrollCount };
  }

  private async getSalesStats(companyId: string) {
    const [totalPartners, thisMonthOrderAgg] = await Promise.all([
      this.prisma.partner.count({ where: { companyId } }),
      this.prisma.salesOrder.aggregate({
        where: {
          companyId,
          orderDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
    ]);
    return {
      scope: 'SALES',
      totalPartners,
      thisMonthOrderCount: thisMonthOrderAgg._count,
      thisMonthOrderTotal: thisMonthOrderAgg._sum.totalAmount ?? 0,
    };
  }

  private async getMyStats(requester: AuthUser) {
    const year = new Date().getFullYear();
    const [attendanceThisMonthCount, leaveBalance, latestPayroll] = await Promise.all([
      this.prisma.attendance.count({
        where: { userId: requester.sub, workDate: { gte: new Date(year, new Date().getMonth(), 1) } },
      }),
      this.prisma.leaveBalance.findUnique({ where: { userId_year: { userId: requester.sub, year } } }),
      this.prisma.payroll.findFirst({
        where: { userId: requester.sub },
        orderBy: [{ payYear: 'desc' }, { payMonth: 'desc' }],
      }),
    ]);
    return { scope: 'SELF', attendanceThisMonthCount, leaveBalance, latestPayroll };
  }
}
