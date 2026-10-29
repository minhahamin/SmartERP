import { AnomalyDetector, findSalesDrops, weekStart } from './anomaly-detector';

describe('이상 징후 계산', () => {
  it('같은 주의 날짜는 같은 월요일로 묶인다', () => {
    expect(weekStart('2026-10-26')).toBe('2026-10-26'); // 월
    expect(weekStart('2026-10-29')).toBe('2026-10-26'); // 목
    expect(weekStart('2026-11-01')).toBe('2026-10-26'); // 일
    expect(weekStart('2026-11-02')).toBe('2026-11-02');
  });

  it('전월 매출이 충분했던 거래처 중 절반 이하로 떨어진 곳만 급감으로 본다', () => {
    const previous = new Map([
      ['a', 10_000_000], // 급감
      ['b', 10_000_000], // 소폭 감소
      ['c', 500_000], // 전월 매출이 작아 제외
      ['d', 4_000_000], // 거래 중단
    ]);
    const current = new Map([
      ['a', 3_000_000],
      ['b', 8_000_000],
      ['c', 0],
    ]);
    const drops = findSalesDrops(previous, current);
    expect(drops.map((d) => d.partnerId)).toEqual(['a', 'd']);
    expect(drops[1]).toMatchObject({ previous: 4_000_000, current: 0 });
  });
});

describe('AnomalyDetector', () => {
  function build() {
    const prisma = {
      attendance: { groupBy: jest.fn() },
      user: { findMany: jest.fn() },
      salesOrder: { groupBy: jest.fn() },
      partner: { findMany: jest.fn() },
    };
    const jobLock = {
      runExclusive: jest.fn().mockImplementation(async (_n: string, fn: () => Promise<unknown>) => ({
        ran: true,
        result: await fn(),
      })),
    };
    const notifier = { notifyByPermission: jest.fn().mockResolvedValue(2) };
    return { service: new AnomalyDetector(prisma as never, jobLock as never, notifier as never), prisma, notifier };
  }

  it('지각·결근이 반복된 직원이 없으면 알리지 않는다', async () => {
    const { service, prisma, notifier } = build();
    prisma.attendance.groupBy.mockResolvedValue([]);
    expect(await service.detectAttendanceForCompany('c1')).toEqual({ flagged: 0, notified: 0 });
    expect(notifier.notifyByPermission).not.toHaveBeenCalled();
  });

  it('반복된 직원을 근태 결재 권한자에게 알리고, 대상 구성이 같으면 같은 키를 쓴다', async () => {
    const { service, prisma, notifier } = build();
    prisma.attendance.groupBy.mockResolvedValue([
      { userId: 'u1', _count: 4 },
      { userId: 'u2', _count: 3 },
    ]);
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', name: '김철수' },
      { id: 'u2', name: '이영희' },
    ]);
    const now = new Date('2026-10-29T00:10:00Z');
    await service.detectAttendanceForCompany('c1', now);
    await service.detectAttendanceForCompany('c1', now);

    const [, permission, input] = notifier.notifyByPermission.mock.calls[0];
    expect(permission).toEqual({ resource: 'ATTENDANCE', action: 'APPROVE' });
    expect(input.message).toBe('김철수(4회), 이영희(3회)');
    expect(input.dedupeKey).toMatch(/^attendance-anomaly:2026-10-26:[0-9a-f]{12}$/);
    expect(notifier.notifyByPermission.mock.calls[1][2].dedupeKey).toBe(input.dedupeKey);
  });

  it('매출이 급감한 거래처를 지난달 기준으로 알린다', async () => {
    const { service, prisma, notifier } = build();
    prisma.salesOrder.groupBy
      .mockResolvedValueOnce([{ partnerId: 'p1', _sum: { totalAmount: 10_000_000 } }]) // 전전월
      .mockResolvedValueOnce([{ partnerId: 'p1', _sum: { totalAmount: 2_000_000 } }]); // 지난달
    prisma.partner.findMany.mockResolvedValue([{ id: 'p1', name: '청우테크' }]);

    // 2026-10-01 KST → 지난달은 9월, 비교 대상은 8월
    const result = await service.detectSalesDropsForCompany('c1', new Date('2026-09-30T16:00:00Z'));

    expect(result).toEqual({ drops: 1, notified: 2 });
    const [, , input] = notifier.notifyByPermission.mock.calls[0];
    expect(input.title).toContain('2026년 9월');
    expect(input.message).toContain('청우테크');
    expect(input.dedupeKey).toBe('sales-drop:2026-9');
  });
});
