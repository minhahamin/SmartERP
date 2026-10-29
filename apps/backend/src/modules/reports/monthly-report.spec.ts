import { ForbiddenException } from '@nestjs/common';
import {
  changeText,
  lastMonthOf,
  monthRange,
  previousMonth,
  templateSummary,
  type MonthlyReportData,
} from './monthly-report';
import { ReportsService } from './reports.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

const data: MonthlyReportData = {
  period: { year: 2026, month: 9 },
  sales: { total: 120_000_000, previousTotal: 100_000_000, orderCount: 14, topPartners: [] },
  inventory: { shortageCount: 3 },
  production: { completed: 8, overdue: 2 },
  attendance: { late: 5, absent: 1, onLeave: 12 },
};

describe('월간 리포트 순수 로직', () => {
  it('월 경계는 UTC 기준 [당월 1일, 다음 달 1일)이고 12월은 다음 해로 넘어간다', () => {
    expect(monthRange(2026, 12)).toEqual({ start: new Date('2026-12-01T00:00:00Z'), end: new Date('2027-01-01T00:00:00Z') });
    expect(previousMonth(2026, 1)).toEqual({ year: 2025, month: 12 });
  });

  it('지난달은 KST 날짜 기준으로 계산한다', () => {
    // 2026-09-30T16:00Z == 2026-10-01 01:00 KST → 지난달은 9월
    expect(lastMonthOf(new Date('2026-09-30T16:00:00Z'))).toEqual({ year: 2026, month: 9 });
    expect(lastMonthOf(new Date('2027-01-01T00:30:00Z'))).toEqual({ year: 2026, month: 12 });
  });

  it('증감률은 전월이 0이면 비교하지 않는다', () => {
    expect(changeText(120, 100)).toBe('전월 대비 +20.0%');
    expect(changeText(80, 100)).toBe('전월 대비 -20.0%');
    expect(changeText(10, 0)).toBe('전월 비교 불가');
  });

  it('고정 요약에 핵심 수치가 모두 들어간다', () => {
    const text = templateSummary(data);
    expect(text).toContain('120,000,000원');
    expect(text).toContain('+20.0%');
    expect(text).toContain('안전재고에 못 미치는 품목은 3개');
    expect(text).toContain('지각 5건, 결근 1건, 휴가 12건');
  });
});

describe('ReportsService', () => {
  const admin: AuthUser = { sub: 'a1', companyId: 'c1', roleId: 'r', roleName: 'ADMIN', departmentId: null };

  function build(stored: unknown = null, apiKey?: string) {
    const prisma = {
      monthlyReport: {
        findUnique: jest.fn().mockResolvedValue(stored),
        upsert: jest.fn().mockImplementation(({ create }) => Promise.resolve({ ...create })),
      },
      company: { findUnique: jest.fn().mockResolvedValue({ name: '테스트' }) },
    };
    const jobLock = { runExclusive: jest.fn() };
    const notifier = { notifyRoles: jest.fn() };
    const config = { get: jest.fn((key: string) => (key === 'GEMINI_API_KEY' ? apiKey : undefined)) };
    const service = new ReportsService(prisma as never, jobLock as never, notifier as never, config as never);
    jest.spyOn(service, 'collect').mockResolvedValue(data);
    return { service, prisma };
  }

  it('저장된 리포트가 있으면 다시 집계하거나 AI를 호출하지 않는다', async () => {
    const { service, prisma } = build({ summary: '저장됨', summarySource: 'AI', data });
    const report = await service.ensureReport('c1', 2026, 9);
    expect(report.summary).toBe('저장됨');
    expect(service.collect).not.toHaveBeenCalled();
    expect(prisma.monthlyReport.upsert).not.toHaveBeenCalled();
  });

  it('AI 키가 없으면 고정 문장으로 요약해 저장한다', async () => {
    const { service, prisma } = build(null, undefined);
    const report = await service.ensureReport('c1', 2026, 9);
    expect(report.summarySource).toBe('TEMPLATE');
    expect(prisma.monthlyReport.upsert).toHaveBeenCalledTimes(1);
  });

  it('관리자가 아니면 PDF를 받을 수 없고, 아직 오지 않은 달은 만들지 않는다', async () => {
    const { service } = build();
    await expect(service.exportPdf(2026, 9, { ...admin, roleName: 'SALES_MANAGER' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.exportPdf(2099, 1, admin)).rejects.toMatchObject({ response: { code: 'REPORT_FUTURE_MONTH' } });
  });

  it('PDF 바이너리를 만든다', async () => {
    const { service } = build({ summary: '요약', summarySource: 'TEMPLATE', data });
    const pdf = await service.exportPdf(2026, 9, admin);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  });
});
