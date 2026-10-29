import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JobLockService } from '../../common/services/job-lock.service';
import { NotifierService } from '../../common/services/notifier.service';
import { formatWon, lastMonthOf, monthRange, previousMonth } from '../reports/monthly-report';

/** 최근 이 일수 동안의 지각·결근을 본다 */
export const ATTENDANCE_WINDOW_DAYS = 14;
/** 창 안에서 지각+결근이 이 횟수 이상이면 반복으로 본다 */
export const ATTENDANCE_REPEAT_THRESHOLD = 3;
/** 거래처 매출이 전월의 이 비율 이하로 떨어지면 급감으로 본다 */
export const SALES_DROP_RATIO = 0.5;
/** 전월 매출이 이 금액 미만인 거래처는 변동 폭이 커 보일 뿐이라 제외한다 */
export const SALES_DROP_MIN_PREVIOUS = 1_000_000;
const MAX_LISTED = 5;

/** 날짜 문자열(YYYY-MM-DD)이 속한 주의 월요일. 같은 주에는 같은 값이라 알림 중복 방지 키에 쓴다 */
export function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export interface SalesDrop {
  partnerId: string;
  previous: number;
  current: number;
}

/** 전월 매출이 충분했던 거래처 중 이번 달 매출이 기준 비율 이하로 떨어진 곳(매출이 0인 경우 포함) */
export function findSalesDrops(previous: Map<string, number>, current: Map<string, number>): SalesDrop[] {
  const drops: SalesDrop[] = [];
  for (const [partnerId, prev] of previous) {
    if (prev < SALES_DROP_MIN_PREVIOUS) continue;
    const curr = current.get(partnerId) ?? 0;
    if (curr <= prev * SALES_DROP_RATIO) drops.push({ partnerId, previous: prev, current: curr });
  }
  return drops.sort((a, b) => b.previous - b.current - (a.previous - a.current));
}

function listWithRest(items: string[]): string {
  const listed = items.slice(0, MAX_LISTED).join(', ');
  return items.length > MAX_LISTED ? `${listed} 외 ${items.length - MAX_LISTED}명` : listed;
}

/**
 * 규칙 기반 이상 징후 감지. AI를 쓰지 않고 정해진 기준으로만 판단하며, 알림만 보낸다(데이터는 바꾸지 않는다).
 * 같은 대상이 같은 기간에 반복해서 알림으로 쌓이지 않도록 기간·대상이 들어간 dedupeKey를 쓴다.
 */
@Injectable()
export class AnomalyDetector {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobLock: JobLockService,
    private readonly notifier: NotifierService,
  ) {}

  async detectAttendanceForCompany(companyId: string, now: Date = new Date()) {
    const run = await this.jobLock.runExclusive(`anomaly-attendance:${companyId}`, () =>
      this.detectAttendance(companyId, now),
    );
    return run.ran ? run.result : { skipped: true as const };
  }

  async detectSalesDropsForCompany(companyId: string, now: Date = new Date()) {
    const { year, month } = lastMonthOf(now);
    const run = await this.jobLock.runExclusive(`anomaly-sales:${companyId}:${year}-${month}`, () =>
      this.detectSalesDrops(companyId, year, month),
    );
    return run.ran ? run.result : { skipped: true as const };
  }

  private async detectAttendance(companyId: string, now: Date) {
    const today = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const from = new Date(Date.parse(`${today}T00:00:00Z`) - (ATTENDANCE_WINDOW_DAYS - 1) * 24 * 60 * 60 * 1000);

    const grouped = await this.prisma.attendance.groupBy({
      by: ['userId'],
      where: {
        workDate: { gte: from, lte: new Date(`${today}T00:00:00Z`) },
        status: { in: ['LATE', 'ABSENT'] },
        user: { companyId, status: 'ACTIVE' },
      },
      _count: true,
      having: { userId: { _count: { gte: ATTENDANCE_REPEAT_THRESHOLD } } },
    });
    if (grouped.length === 0) return { flagged: 0, notified: 0 };

    const users = await this.prisma.user.findMany({
      where: { id: { in: grouped.map((g) => g.userId) } },
      select: { id: true, name: true },
    });
    const name = new Map(users.map((u) => [u.id, u.name]));
    const flagged = grouped
      .sort((a, b) => b._count - a._count)
      .map((g) => ({ userId: g.userId, label: `${name.get(g.userId) ?? '-'}(${g._count}회)` }));

    // 같은 주 안에서는 대상 구성이 같으면 한 번만 알리고, 새로 걸린 사람이 생기면 다시 알린다
    const digest = createHash('sha1').update(flagged.map((f) => f.userId).sort().join(',')).digest('hex').slice(0, 12);
    const notified = await this.notifier.notifyByPermission(
      companyId,
      { resource: 'ATTENDANCE', action: 'APPROVE' },
      {
        type: 'ATTENDANCE_ANOMALY',
        title: `최근 ${ATTENDANCE_WINDOW_DAYS}일 동안 지각·결근이 반복된 직원이 ${flagged.length}명 있습니다`,
        message: listWithRest(flagged.map((f) => f.label)),
        link: '/employees',
        dedupeKey: `attendance-anomaly:${weekStart(today)}:${digest}`,
      },
    );
    return { flagged: flagged.length, notified };
  }

  private async detectSalesDrops(companyId: string, year: number, month: number) {
    const prev = previousMonth(year, month);
    const sumByPartner = async (y: number, m: number) => {
      const { start, end } = monthRange(y, m);
      const rows = await this.prisma.salesOrder.groupBy({
        by: ['partnerId'],
        where: { companyId, status: { not: 'CANCELLED' }, orderDate: { gte: start, lt: end } },
        _sum: { totalAmount: true },
      });
      return new Map(rows.map((r) => [r.partnerId, Number(r._sum.totalAmount ?? 0)]));
    };

    const drops = findSalesDrops(await sumByPartner(prev.year, prev.month), await sumByPartner(year, month));
    if (drops.length === 0) return { drops: 0, notified: 0 };

    const partners = await this.prisma.partner.findMany({
      where: { id: { in: drops.map((d) => d.partnerId) } },
      select: { id: true, name: true },
    });
    const name = new Map(partners.map((p) => [p.id, p.name]));
    const notified = await this.notifier.notifyByPermission(
      companyId,
      { resource: 'SALES_ORDER', action: 'UPDATE' },
      {
        type: 'SALES_DROP',
        title: `${year}년 ${month}월 매출이 급감한 거래처가 ${drops.length}곳 있습니다`,
        message: listWithRest(
          drops.map((d) => `${name.get(d.partnerId) ?? '-'} ${formatWon(d.previous)}→${formatWon(d.current)}`),
        ),
        link: '/partners',
        dedupeKey: `sales-drop:${year}-${month}`,
      },
    );
    return { drops: drops.length, notified };
  }
}
