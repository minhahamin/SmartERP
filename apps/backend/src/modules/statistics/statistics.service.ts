import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

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
    const [totalEmployees, totalDepartments, lowStockCount, delayedOrderCount, pendingLeaveCount] = await Promise.all([
      this.prisma.user.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.department.count({ where: { companyId } }),
      this.countLowStock(companyId),
      this.prisma.productionOrder.count({ where: { companyId, status: { notIn: ['COMPLETED', 'CANCELLED'] }, dueDate: { lt: now } } }),
      this.prisma.leaveRequest.count({ where: { user: { companyId }, status: 'PENDING' } }),
    ]);
    return { scope: 'COMPANY', totalEmployees, totalDepartments, lowStockCount, delayedOrderCount, pendingLeaveCount };
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
        where: { companyId, orderDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
        _sum: { totalAmount: true },
        _count: true,
      }),
    ]);
    return { scope: 'SALES', totalPartners, thisMonthOrderCount: thisMonthOrderAgg._count, thisMonthOrderTotal: thisMonthOrderAgg._sum.totalAmount ?? 0 };
  }

  private async getMyStats(requester: AuthUser) {
    const year = new Date().getFullYear();
    const [attendanceThisMonthCount, leaveBalance, latestPayroll] = await Promise.all([
      this.prisma.attendance.count({
        where: { userId: requester.sub, workDate: { gte: new Date(year, new Date().getMonth(), 1) } },
      }),
      this.prisma.leaveBalance.findUnique({ where: { userId_year: { userId: requester.sub, year } } }),
      this.prisma.payroll.findFirst({ where: { userId: requester.sub }, orderBy: [{ payYear: 'desc' }, { payMonth: 'desc' }] }),
    ]);
    return { scope: 'SELF', attendanceThisMonthCount, leaveBalance, latestPayroll };
  }
}
