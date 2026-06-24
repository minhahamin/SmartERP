import { Injectable, NotFoundException } from '@nestjs/common';
import type { Payroll } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PolicyService } from '../../common/services/policy.service';
import { AppException } from '../../common/exceptions/app.exception';
import { paginate } from '../../common/interfaces/paginated-result.interface';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import {
  GeneratePayrollDto,
  PayrollHistoryQueryDto,
  PayrollQueryDto,
  UpdatePayrollDto,
} from './dto/payroll.dto';

function sum(values: Record<string, number>): number {
  return Object.values(values).reduce((a, b) => a + b, 0);
}

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  async findAll(query: PayrollQueryDto, requester: AuthUser) {
    const where = { payYear: query.year, payMonth: query.month, user: { companyId: requester.companyId } };
    const [items, total] = await Promise.all([
      this.prisma.payroll.findMany({
        where,
        include: { user: true },
        orderBy: { user: { employeeNo: 'asc' } },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.payroll.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  findMine(userId: string) {
    return this.prisma.payroll.findMany({
      where: { userId },
      orderBy: [{ payYear: 'desc' }, { payMonth: 'desc' }],
    });
  }

  async findHistoryForUser(userId: string, query: PayrollHistoryQueryDto, requester: AuthUser) {
    await this.policy.assertAccess(requester, 'PAYROLL', 'READ', userId);
    return this.prisma.payroll.findMany({
      where: { userId, ...(query.year ? { payYear: query.year } : {}) },
      orderBy: [{ payYear: 'desc' }, { payMonth: 'desc' }],
    });
  }

  /** docs/08.4.3 — 월별 급여 일괄 생성(DRAFT). 이미 존재하는 (user,year,month) 조합은 건너뛴다(unique 제약) */
  async generateMonthly(dto: GeneratePayrollDto, requester: AuthUser) {
    const employees = await this.prisma.user.findMany({
      where: { companyId: requester.companyId, status: 'ACTIVE', baseSalary: { not: null } },
    });

    await this.prisma.payroll.createMany({
      data: employees.map((employee) => ({
        userId: employee.id,
        payYear: dto.year,
        payMonth: dto.month,
        baseSalary: employee.baseSalary!,
        netSalary: employee.baseSalary!,
        createdBy: requester.sub,
      })),
      skipDuplicates: true,
    });

    return this.findAll({ year: dto.year, month: dto.month, page: 1, limit: 100 }, requester);
  }

  async update(id: string, dto: UpdatePayrollDto) {
    const payroll = await this.findOrThrow(id);
    if (payroll.status !== 'DRAFT') {
      throw new AppException(
        'PAYROLL_ALREADY_CONFIRMED',
        '확정된 급여는 수당/공제를 수정할 수 없습니다.',
        409,
      );
    }

    const allowances = dto.allowances ?? (payroll.allowances as Record<string, number>);
    const deductions = dto.deductions ?? (payroll.deductions as Record<string, number>);
    const netSalary = Number(payroll.baseSalary) + sum(allowances) - sum(deductions);

    return this.prisma.payroll.update({ where: { id }, data: { allowances, deductions, netSalary } });
  }

  /** docs/08.1 — 상태 전이 액션은 이미 해당 상태인 경우 200으로 현재 상태를 반환(멱등) */
  async confirm(id: string) {
    const payroll = await this.findOrThrow(id);
    if (payroll.status === 'CONFIRMED') return payroll;
    if (payroll.status === 'PAID') {
      throw new AppException('PAYROLL_ALREADY_CONFIRMED', '이미 지급 완료된 급여입니다.', 409);
    }
    return this.prisma.payroll.update({
      where: { id },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });
  }

  async pay(id: string) {
    const payroll = await this.findOrThrow(id);
    if (payroll.status === 'PAID') return payroll;
    if (payroll.status !== 'CONFIRMED') {
      throw new AppException('PAYROLL_NOT_CONFIRMED', '확정되지 않은 급여는 지급 처리할 수 없습니다.', 409);
    }
    return this.prisma.payroll.update({ where: { id }, data: { status: 'PAID', paidAt: new Date() } });
  }

  async getPayslip(id: string, requester: AuthUser) {
    const payroll = await this.findOrThrow(id);
    await this.policy.assertAccess(requester, 'PAYROLL', 'READ', payroll.userId);
    // PDF 렌더링은 범위 밖(docs 07/08/12/13/14에 PDF 엔진 명시 없음) — 명세서 데이터를 그대로 반환
    return payroll;
  }

  private async findOrThrow(id: string): Promise<Payroll> {
    const payroll = await this.prisma.payroll.findUnique({ where: { id } });
    if (!payroll) throw new NotFoundException('급여 항목을 찾을 수 없습니다.');
    return payroll;
  }
}
