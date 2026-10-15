import { StatisticsService } from './statistics.service';

describe('StatisticsService — 이번 달 매출 집계', () => {
  it('해당 월의 시작~다음 달 시작 미만으로만 집계한다(미래 달 주문 제외)', async () => {
    const aggregate = jest.fn().mockResolvedValue({ _sum: { totalAmount: 2045000 } });
    const service = new StatisticsService({ salesOrder: { aggregate } } as never, {} as never);

    const monthStart = new Date(2026, 9, 1); // 2026-10-01
    const revenue = await (
      service as unknown as {
        sumRevenueSince(companyId: string, monthStart: Date): Promise<number>;
      }
    ).sumRevenueSince('company-1', monthStart);

    expect(revenue).toBe(2045000);
    expect(aggregate).toHaveBeenCalledWith({
      where: {
        companyId: 'company-1',
        orderDate: { gte: monthStart, lt: new Date(2026, 10, 1) },
        status: { not: 'CANCELLED' },
      },
      _sum: { totalAmount: true },
    });
  });
});
