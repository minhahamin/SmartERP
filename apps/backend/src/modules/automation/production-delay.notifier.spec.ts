import { ProductionDelayNotifier, daysOverdue, kstDate, summarizeDelays } from './production-delay.notifier';

describe('생산 지연 알림 계산', () => {
  it('KST 기준 날짜와 지연 일수를 계산한다', () => {
    // 2026-10-29T16:00Z == 2026-10-30 01:00 KST
    expect(kstDate(new Date('2026-10-29T16:00:00Z'))).toBe('2026-10-30');
    expect(daysOverdue('2026-10-27', '2026-10-30')).toBe(3);
    expect(daysOverdue('2026-10-30', '2026-10-30')).toBe(0);
  });

  it('가장 오래 지연된 오더부터 5건만 나열하고 나머지는 건수로 줄인다', () => {
    const orders = Array.from({ length: 7 }, (_, i) => ({
      orderNo: `PO-${i}`,
      productName: '제품',
      managerId: null,
      dueDate: `2026-10-${String(20 + i).padStart(2, '0')}`,
    }));
    const text = summarizeDelays(orders, '2026-10-30');
    expect(text.startsWith('PO-0 제품(D+10)')).toBe(true);
    expect(text.endsWith('외 2건')).toBe(true);
  });
});

describe('ProductionDelayNotifier', () => {
  function build(rows: unknown[]) {
    const prisma = { productionOrder: { findMany: jest.fn().mockResolvedValue(rows) } };
    const jobLock = {
      runExclusive: jest.fn().mockImplementation(async (_n: string, fn: () => Promise<unknown>) => ({
        ran: true,
        result: await fn(),
      })),
    };
    const notifier = {
      notifyUsers: jest.fn().mockResolvedValue(1),
      notifyRoles: jest.fn().mockResolvedValue(1),
    };
    return { service: new ProductionDelayNotifier(prisma as never, jobLock as never, notifier as never), prisma, notifier };
  }

  const row = (orderNo: string, managerId: string | null) => ({
    orderNo,
    managerId,
    dueDate: new Date('2026-10-27T00:00:00Z'),
    product: { name: '제품' },
  });

  it('지연 오더가 없으면 아무에게도 알리지 않는다', async () => {
    const { service, notifier } = build([]);
    expect(await service.notifyForCompany('c1', new Date('2026-10-30T01:00:00Z'))).toEqual({ delayed: 0, notified: 0 });
    expect(notifier.notifyUsers).not.toHaveBeenCalled();
    expect(notifier.notifyRoles).not.toHaveBeenCalled();
  });

  it('담당자별로 묶어 알리고 관리자에게는 전체를 알리며, 날짜 기반 중복 방지 키를 쓴다', async () => {
    const { service, notifier } = build([row('PO-1', 'u1'), row('PO-2', 'u1'), row('PO-3', 'u2'), row('PO-4', null)]);
    await service.notifyForCompany('c1', new Date('2026-10-30T01:00:00Z'));

    expect(notifier.notifyUsers).toHaveBeenCalledTimes(2);
    expect(notifier.notifyUsers.mock.calls[0][0]).toEqual(['u1']);
    expect(notifier.notifyUsers.mock.calls[0][1]).toMatchObject({
      title: '내 담당 생산 오더 2건이 납기를 넘겼습니다',
      dedupeKey: 'production-delay:2026-10-30',
    });
    expect(notifier.notifyRoles).toHaveBeenCalledWith(
      'c1',
      ['ADMIN'],
      expect.objectContaining({ title: '납기를 넘긴 생산 오더가 4건 있습니다' }),
    );
  });

  it('오늘 납기인 오더는 지연으로 보지 않도록 오늘 0시(KST) 이전만 조회한다', async () => {
    const { service, prisma } = build([]);
    await service.notifyForCompany('c1', new Date('2026-10-30T01:00:00Z'));
    expect(prisma.productionOrder.findMany.mock.calls[0][0].where.dueDate).toEqual({
      lt: new Date('2026-10-30T00:00:00Z'),
    });
  });
});
