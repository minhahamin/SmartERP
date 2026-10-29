import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { JobLockService } from '../../common/services/job-lock.service';
import { NotifierService } from '../../common/services/notifier.service';
import { createKoreanPdfDoc, pdfDocToBuffer } from '../../common/utils/korean-pdf';
import { retryTransient } from '../../common/utils/retry-transient';
import {
  buildSummaryPrompt,
  changeText,
  formatWon,
  lastMonthOf,
  monthRange,
  previousMonth,
  templateSummary,
  type MonthlyReportData,
} from './monthly-report';

const TOP_PARTNER_COUNT = 3;

/**
 * 월간 경영 리포트. 수치는 DB에서 직접 집계하고(AI는 숫자를 만들지 않는다), 요약 문장만 Gemini에 맡긴다.
 * 월 1회 생성해 저장하므로 PDF를 몇 번 내려받아도 AI 호출은 늘지 않고, AI를 못 쓰면 고정 문장으로 대체한다.
 */
@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly gemini: GoogleGenAI | null;
  private readonly model: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobLock: JobLockService,
    private readonly notifier: NotifierService,
    config: ConfigService,
  ) {
    const apiKey = config.get<string>('GEMINI_API_KEY');
    this.gemini = apiKey ? new GoogleGenAI({ apiKey }) : null;
    this.model = config.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';
  }

  /** 스케줄러 진입점: 지난달 리포트를 만들고 관리자에게 알린다 */
  async generateLastMonthForCompany(companyId: string, now: Date = new Date()) {
    const { year, month } = lastMonthOf(now);
    const run = await this.jobLock.runExclusive(`monthly-report:${companyId}:${year}-${month}`, async () => {
      const report = await this.ensureReport(companyId, year, month);
      await this.notifier.notifyRoles(companyId, ['ADMIN'], {
        type: 'MONTHLY_REPORT',
        title: `${year}년 ${month}월 경영 리포트가 준비되었습니다`,
        message: '통계 분석 화면에서 PDF로 내려받을 수 있습니다.',
        link: '/statistics',
        dedupeKey: `monthly-report:${year}-${month}`,
      });
      return { year, month, source: report.summarySource };
    });
    return run.ran ? run.result : { skipped: true as const };
  }

  /** 저장된 리포트가 있으면 그대로, 없으면 지금 집계해 저장한다 */
  async ensureReport(companyId: string, year: number, month: number) {
    const existing = await this.prisma.monthlyReport.findUnique({
      where: { companyId_year_month: { companyId, year, month } },
    });
    if (existing) return existing;

    const data = await this.collect(companyId, year, month);
    const { summary, source } = await this.summarize(data);
    return this.prisma.monthlyReport.upsert({
      where: { companyId_year_month: { companyId, year, month } },
      create: { companyId, year, month, data: data as unknown as Prisma.InputJsonValue, summary, summarySource: source },
      update: {},
    });
  }

  async exportPdf(year: number, month: number, requester: AuthUser): Promise<Buffer> {
    // 리포트에는 매출·인사 집계가 함께 들어 있어 통계 화면에서 가장 넓은 권한(관리자)만 받을 수 있다
    if (requester.roleName !== 'ADMIN') throw new ForbiddenException('관리자만 월간 리포트를 내려받을 수 있습니다.');
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const isFuture = year * 12 + month > kst.getUTCFullYear() * 12 + (kst.getUTCMonth() + 1);
    if (isFuture) throw new AppException('REPORT_FUTURE_MONTH', '아직 오지 않은 달의 리포트는 만들 수 없습니다.', 400);

    const report = await this.ensureReport(requester.companyId, year, month);
    const company = await this.prisma.company.findUnique({ where: { id: requester.companyId }, select: { name: true } });
    return this.renderPdf(company?.name ?? '', report.data as unknown as MonthlyReportData, report.summary, report.summarySource);
  }

  async collect(companyId: string, year: number, month: number): Promise<MonthlyReportData> {
    const { start, end } = monthRange(year, month);
    const prev = previousMonth(year, month);
    const prevRange = monthRange(prev.year, prev.month);
    const salesWhere = (from: Date, to: Date): Prisma.SalesOrderWhereInput => ({
      companyId,
      status: { not: 'CANCELLED' },
      orderDate: { gte: from, lt: to },
    });

    const [orders, prevAgg, byPartner, products, completed, overdue, attendance] = await Promise.all([
      this.prisma.salesOrder.aggregate({ where: salesWhere(start, end), _sum: { totalAmount: true }, _count: true }),
      this.prisma.salesOrder.aggregate({ where: salesWhere(prevRange.start, prevRange.end), _sum: { totalAmount: true } }),
      this.prisma.salesOrder.groupBy({
        by: ['partnerId'],
        where: salesWhere(start, end),
        _sum: { totalAmount: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: TOP_PARTNER_COUNT,
      }),
      this.prisma.product.findMany({
        where: { companyId, isActive: true, safetyStock: { gt: 0 } },
        select: { safetyStock: true, inventories: { select: { quantity: true } } },
      }),
      this.prisma.productionOrder.count({
        where: { companyId, status: 'COMPLETED', dueDate: { gte: start, lt: end } },
      }),
      this.prisma.productionOrder.count({
        where: { companyId, status: { in: ['PLANNED', 'IN_PROGRESS', 'DELAYED'] }, dueDate: { lt: end } },
      }),
      this.prisma.attendance.groupBy({
        by: ['status'],
        where: { workDate: { gte: start, lt: end }, user: { companyId } },
        _count: true,
      }),
    ]);

    const partners = await this.prisma.partner.findMany({
      where: { id: { in: byPartner.map((p) => p.partnerId) } },
      select: { id: true, name: true },
    });
    const partnerName = new Map(partners.map((p) => [p.id, p.name]));
    const attendanceCount = (status: string) => attendance.find((a) => a.status === status)?._count ?? 0;

    return {
      period: { year, month },
      sales: {
        total: Number(orders._sum.totalAmount ?? 0),
        previousTotal: Number(prevAgg._sum.totalAmount ?? 0),
        orderCount: orders._count,
        topPartners: byPartner.map((p) => ({ name: partnerName.get(p.partnerId) ?? '-', amount: Number(p._sum.totalAmount ?? 0) })),
      },
      inventory: {
        shortageCount: products.filter((p) => p.inventories.reduce((sum, i) => sum + i.quantity, 0) < p.safetyStock).length,
      },
      production: { completed, overdue },
      attendance: { late: attendanceCount('LATE'), absent: attendanceCount('ABSENT'), onLeave: attendanceCount('ON_LEAVE') },
    };
  }

  private async summarize(data: MonthlyReportData): Promise<{ summary: string; source: 'AI' | 'TEMPLATE' }> {
    if (this.gemini) {
      try {
        const response = await retryTransient(() =>
          this.gemini!.models.generateContent({ model: this.model, contents: buildSummaryPrompt(data) }),
        );
        const text = response.text?.trim();
        if (text) return { summary: text, source: 'AI' };
      } catch (error) {
        this.logger.warn(`리포트 요약 AI 호출 실패 — 고정 문장으로 대체: ${error instanceof Error ? error.message : error}`);
      }
    }
    return { summary: templateSummary(data), source: 'TEMPLATE' };
  }

  private async renderPdf(companyName: string, data: MonthlyReportData, summary: string, source: string): Promise<Buffer> {
    const doc = createKoreanPdfDoc();
    const line = (label: string, value: string) => {
      doc.font('Pretendard-Bold').fontSize(11).text(`${label}  `, { continued: true }).font('Pretendard').text(value);
      doc.moveDown(0.4);
    };
    const heading = (text: string) => {
      doc.moveDown(0.8);
      doc.font('Pretendard-Bold').fontSize(13).text(text);
      doc.moveDown(0.4);
    };

    doc.font('Pretendard-Bold').fontSize(20).text(`${data.period.year}년 ${data.period.month}월 경영 리포트`);
    doc.font('Pretendard').fontSize(10).fillColor('#666666').text(companyName);
    doc.fillColor('#000000');

    heading('요약');
    doc.font('Pretendard').fontSize(11).text(summary, { lineGap: 4 });
    doc.fontSize(9).fillColor('#888888').text(source === 'AI' ? 'AI가 아래 집계 수치를 바탕으로 작성한 요약입니다.' : '집계 수치로 자동 작성한 요약입니다.');
    doc.fillColor('#000000').fontSize(11);

    heading('매출');
    line('매출 합계', `${formatWon(data.sales.total)} (${changeText(data.sales.total, data.sales.previousTotal)})`);
    line('수주 건수', `${data.sales.orderCount}건`);
    data.sales.topPartners.forEach((p, i) => line(`거래처 ${i + 1}위`, `${p.name} · ${formatWon(p.amount)}`));

    heading('생산·재고');
    line('완료한 생산 오더', `${data.production.completed}건`);
    line('납기 지연 미완료', `${data.production.overdue}건`);
    line('안전재고 미달 품목', `${data.inventory.shortageCount}개`);

    heading('근태');
    line('지각', `${data.attendance.late}건`);
    line('결근', `${data.attendance.absent}건`);
    line('휴가', `${data.attendance.onLeave}건`);

    return pdfDocToBuffer(doc);
  }
}
