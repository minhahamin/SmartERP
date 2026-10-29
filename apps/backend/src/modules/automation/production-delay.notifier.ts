import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JobLockService } from '../../common/services/job-lock.service';
import { NotifierService } from '../../common/services/notifier.service';

const MAX_LISTED = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface DelayedOrder {
  orderNo: string;
  productName: string;
  managerId: string | null;
  /** 납기일(KST 기준 날짜, YYYY-MM-DD) */
  dueDate: string;
}

export function kstDate(now: Date): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 납기일로부터 며칠 지났는지(달력 기준). 오늘이 납기일이면 0 */
export function daysOverdue(dueDate: string, today: string): number {
  return Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${dueDate}T00:00:00Z`)) / DAY_MS);
}

/** 알림 본문: 가장 오래 지연된 오더부터 최대 5건만 나열하고 나머지는 건수로 줄인다 */
export function summarizeDelays(orders: DelayedOrder[], today: string): string {
  const sorted = [...orders].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const listed = sorted
    .slice(0, MAX_LISTED)
    .map((o) => `${o.orderNo} ${o.productName}(D+${daysOverdue(o.dueDate, today)})`)
    .join(', ');
  const rest = sorted.length - MAX_LISTED;
  return rest > 0 ? `${listed} 외 ${rest}건` : listed;
}

/**
 * 납기를 넘겼는데 아직 끝나지 않은 생산 오더를 담당자와 관리자에게 알린다. 알림만 보내고 오더의 상태는
 * 바꾸지 않는다 — 지연 판정은 사람이 상태를 바꿀 때만 반영한다. 같은 날 여러 번 돌아도 dedupeKey로 한 번만 쌓인다.
 */
@Injectable()
export class ProductionDelayNotifier {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobLock: JobLockService,
    private readonly notifier: NotifierService,
  ) {}

  async notifyForCompany(companyId: string, now: Date = new Date()) {
    const run = await this.jobLock.runExclusive(`production-delay:${companyId}`, () =>
      this.notify(companyId, now),
    );
    return run.ran ? run.result : { skipped: true as const };
  }

  private async notify(companyId: string, now: Date) {
    const today = kstDate(now);
    const rows = await this.prisma.productionOrder.findMany({
      where: {
        companyId,
        status: { in: ['PLANNED', 'IN_PROGRESS', 'DELAYED'] },
        dueDate: { lt: new Date(`${today}T00:00:00Z`) },
      },
      select: { orderNo: true, managerId: true, dueDate: true, product: { select: { name: true } } },
    });
    if (rows.length === 0) return { delayed: 0, notified: 0 };

    const orders: DelayedOrder[] = rows.map((r) => ({
      orderNo: r.orderNo,
      productName: r.product.name,
      managerId: r.managerId,
      dueDate: r.dueDate.toISOString().slice(0, 10),
    }));

    let notified = 0;
    const byManager = new Map<string, DelayedOrder[]>();
    for (const order of orders) {
      if (!order.managerId) continue;
      byManager.set(order.managerId, [...(byManager.get(order.managerId) ?? []), order]);
    }
    for (const [managerId, mine] of byManager) {
      notified += await this.notifier.notifyUsers([managerId], {
        type: 'PRODUCTION_DELAY',
        title: `내 담당 생산 오더 ${mine.length}건이 납기를 넘겼습니다`,
        message: summarizeDelays(mine, today),
        link: '/production',
        dedupeKey: `production-delay:${today}`,
      });
    }
    notified += await this.notifier.notifyRoles(companyId, ['ADMIN'], {
      type: 'PRODUCTION_DELAY',
      title: `납기를 넘긴 생산 오더가 ${orders.length}건 있습니다`,
      message: summarizeDelays(orders, today),
      link: '/production',
      dedupeKey: `production-delay:${today}`,
    });
    return { delayed: orders.length, notified };
  }
}
