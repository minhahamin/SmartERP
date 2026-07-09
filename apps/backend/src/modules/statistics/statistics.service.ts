import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LeaveService } from '../leave/leave.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaveService: LeaveService,
  ) {}

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
      this.leaveService.findBalance(requester.sub, year),
    ]);

    const attendance: ChartPoint[] = records.reverse().map((r) => ({
      label: r.workDate.toISOString().slice(5, 10),
      value: r.workMinutes ? Math.round((r.workMinutes / 60) * 10) / 10 : 0,
    }));

    return {
      attendance,
      leave: {
        total: leaveBalance.totalDays,
        used: leaveBalance.usedDays,
        remaining: leaveBalance.remainingDays,
      },
    };
  }

  /** docs/02 2.2 — 대시보드: ADMIN=전체, HR_MANAGER=인사, SALES_MANAGER=영업, EMPLOYEE=본인만 KPI가 다르다 */
  async getDashboard(requester: AuthUser) {
    const [kpis, salesTrend, lowStockProducts, recentAnnouncements] = await Promise.all([
      this.getKpis(requester),
      this.getRecentSalesTrend(requester.companyId),
      this.getLowStockProducts(requester.companyId),
      this.getRecentAnnouncements(requester),
    ]);
    return { kpis, salesTrend, lowStockProducts, recentAnnouncements };
  }

  private async getKpis(requester: AuthUser) {
    const { companyId, sub, roleName } = requester;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    switch (roleName) {
      case 'ADMIN': {
        const [revenue, headcount, lowStockCount, delayedCount] = await Promise.all([
          this.sumRevenueSince(companyId, monthStart),
          this.prisma.user.count({ where: { companyId, status: 'ACTIVE' } }),
          this.countLowStock(companyId),
          this.prisma.productionOrder.count({ where: { companyId, status: 'DELAYED' } }),
        ]);
        return [
          { key: 'revenue', label: '이번 달 매출', value: formatWon(revenue) },
          { key: 'headcount', label: '재직 인원', value: `${headcount}명` },
          {
            key: 'lowStock',
            label: '재고 경고',
            value: `${lowStockCount}건`,
            helperText: lowStockCount > 0 ? '즉시 확인 필요' : undefined,
          },
          {
            key: 'delayedProduction',
            label: '생산 지연',
            value: `${delayedCount}건`,
            helperText: '생산 관리에서 확인',
          },
        ];
      }
      case 'HR_MANAGER': {
        const [headcount, pendingLeave, draftPayroll, delayedCount] = await Promise.all([
          this.prisma.user.count({ where: { companyId, status: 'ACTIVE' } }),
          this.prisma.leaveRequest.count({ where: { user: { companyId }, status: 'PENDING' } }),
          this.prisma.payroll.count({
            where: {
              user: { companyId },
              status: 'DRAFT',
              payYear: now.getFullYear(),
              payMonth: now.getMonth() + 1,
            },
          }),
          this.prisma.productionOrder.count({ where: { companyId, status: 'DELAYED' } }),
        ]);
        return [
          { key: 'headcount', label: '재직 인원', value: `${headcount}명` },
          {
            key: 'pendingLeave',
            label: '휴가 승인 대기',
            value: `${pendingLeave}건`,
            helperText: pendingLeave > 0 ? '결재 필요' : undefined,
          },
          {
            key: 'unpaidPayroll',
            label: '이번 달 급여 미확정',
            value: `${draftPayroll}건`,
            helperText: `${now.getMonth() + 1}월 급여`,
          },
          { key: 'delayedProduction', label: '생산 지연(참고)', value: `${delayedCount}건` },
        ];
      }
      case 'SALES_MANAGER': {
        const [revenue, partners, lowStockCount] = await Promise.all([
          this.sumRevenueSince(companyId, monthStart),
          this.prisma.partner.count({ where: { companyId } }),
          this.countLowStock(companyId),
        ]);
        return [
          { key: 'revenue', label: '이번 달 매출', value: formatWon(revenue) },
          { key: 'partners', label: '거래처 수', value: `${partners}곳` },
          {
            key: 'lowStock',
            label: '재고 경고',
            value: `${lowStockCount}건`,
            helperText: lowStockCount > 0 ? '즉시 확인 필요' : undefined,
          },
        ];
      }
      default: {
        const year = now.getFullYear();
        const [leaveBalance, pendingLeave, delayedCount, myPayroll] = await Promise.all([
          this.leaveService.findBalance(sub, year),
          this.prisma.leaveRequest.count({ where: { userId: sub, status: 'PENDING' } }),
          this.prisma.productionOrder.count({ where: { managerId: sub, status: 'DELAYED' } }),
          this.prisma.payroll.findFirst({
            where: { userId: sub, payYear: year, payMonth: now.getMonth() + 1 },
          }),
        ]);
        return [
          {
            key: 'myLeaveBalance',
            label: '내 연차 잔여',
            value: `${leaveBalance.remainingDays}일`,
          },
          {
            key: 'pendingLeave',
            label: '내 휴가 신청',
            value: `${pendingLeave}건`,
            helperText: pendingLeave > 0 ? '승인 대기' : undefined,
          },
          {
            key: 'delayedProduction',
            label: '내 생산 작업',
            value: `${delayedCount}건`,
            helperText: delayedCount > 0 ? '지연' : undefined,
          },
          {
            key: 'unpaidPayroll',
            label: '이번 달 급여',
            value: myPayroll ? (myPayroll.status === 'DRAFT' ? '미확정' : '확정') : '없음',
            helperText: `${now.getMonth() + 1}월`,
          },
        ];
      }
    }
  }

  private async sumRevenueSince(companyId: string, since: Date): Promise<number> {
    const agg = await this.prisma.salesOrder.aggregate({
      where: { companyId, orderDate: { gte: since }, status: { not: 'CANCELLED' } },
      _sum: { totalAmount: true },
    });
    return Number(agg._sum.totalAmount ?? 0);
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

  private async getRecentSalesTrend(companyId: string) {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const orders = await this.prisma.salesOrder.findMany({
      where: { companyId, orderDate: { gte: sixMonthsAgo }, status: { not: 'CANCELLED' } },
    });

    const monthlyMap = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthlyMap.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
    }
    for (const order of orders) {
      const key = `${order.orderDate.getFullYear()}-${order.orderDate.getMonth()}`;
      if (monthlyMap.has(key)) monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Number(order.totalAmount));
    }

    return Array.from(monthlyMap.entries()).map(([key, revenue]) => ({
      month: MONTH_LABELS[Number(key.split('-')[1])],
      revenue,
    }));
  }

  /** 대시보드 요약 카드용 상위 5건 — 가장 부족한(현재고 낮은) 순 */
  private async getLowStockProducts(companyId: string) {
    return this.prisma.$queryRaw<
      { id: string; name: string; quantity: number; safetyStock: number; warehouseName: string }[]
    >`
      SELECT p.id, p.name, i.quantity, p."safetyStock", w.name as "warehouseName"
      FROM inventories i
      JOIN products p ON p.id = i."productId"
      JOIN warehouses w ON w.id = i."warehouseId"
      WHERE p."companyId" = ${companyId} AND i.quantity <= p."safetyStock"
      ORDER BY i.quantity ASC
      LIMIT 5
    `;
  }

  private async getRecentAnnouncements(requester: AuthUser) {
    const announcements = await this.prisma.announcement.findMany({
      where: {
        companyId: requester.companyId,
        OR: [{ targetRoleId: null }, { targetRoleId: requester.roleId }],
      },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      take: 3,
    });

    const roleIds = [
      ...new Set(announcements.map((a) => a.targetRoleId).filter((id): id is string => id !== null)),
    ];
    const roles =
      roleIds.length > 0 ? await this.prisma.role.findMany({ where: { id: { in: roleIds } } }) : [];
    const roleNameById = new Map(roles.map((r) => [r.id, r.name]));

    return announcements.map((a) => ({
      id: a.id,
      title: a.title,
      scope: a.targetRoleId ? (ROLE_LABEL[roleNameById.get(a.targetRoleId) ?? ''] ?? '지정 역할') : '전사',
      pinned: a.isPinned,
      publishedAt: a.publishedAt.toISOString().slice(0, 10),
    }));
  }
}

function formatWon(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`;
}
