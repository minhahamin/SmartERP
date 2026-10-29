/** 월간 리포트의 순수 로직(기간 계산·문장 조립). DB나 AI 없이 테스트할 수 있게 서비스와 분리했다 */

export interface MonthlyReportData {
  period: { year: number; month: number };
  sales: {
    total: number;
    previousTotal: number;
    orderCount: number;
    topPartners: { name: string; amount: number }[];
  };
  inventory: { shortageCount: number };
  production: { completed: number; overdue: number };
  attendance: { late: number; absent: number; onLeave: number };
}

/** [시작, 다음 달 시작) — 날짜 컬럼(@db.Date)은 UTC 자정으로 저장되므로 UTC 기준으로 경계를 만든다 */
export function monthRange(year: number, month: number): { start: Date; end: Date } {
  return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) };
}

export function previousMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

/** 실행 시점(KST)의 직전 달. 매월 1일에 지난달 리포트를 만들 때 쓴다 */
export function lastMonthOf(now: Date): { year: number; month: number } {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return previousMonth(kst.getUTCFullYear(), kst.getUTCMonth() + 1);
}

export function formatWon(value: number): string {
  return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

/** 전월 대비 증감률 문구. 전월 값이 0이면 비교하지 않는다 */
export function changeText(current: number, previous: number): string {
  if (previous <= 0) return '전월 비교 불가';
  const rate = ((current - previous) / previous) * 100;
  return `전월 대비 ${rate >= 0 ? '+' : ''}${rate.toFixed(1)}%`;
}

/** AI를 쓸 수 없을 때 수치만으로 만드는 고정 요약 */
export function templateSummary(data: MonthlyReportData): string {
  const { period, sales, inventory, production, attendance } = data;
  const parts = [
    `${period.year}년 ${period.month}월 매출은 ${formatWon(sales.total)}(${changeText(sales.total, sales.previousTotal)})이고 수주는 ${sales.orderCount}건입니다.`,
    `납기를 넘긴 미완료 생산 오더는 ${production.overdue}건, 완료한 오더는 ${production.completed}건입니다.`,
    `현재 안전재고에 못 미치는 품목은 ${inventory.shortageCount}개입니다.`,
    `근태는 지각 ${attendance.late}건, 결근 ${attendance.absent}건, 휴가 ${attendance.onLeave}건이 기록되었습니다.`,
  ];
  return parts.join(' ');
}

/** 모델에는 집계 수치만 주고 새 숫자를 만들지 못하게 한다. 개인 이름은 넘기지 않는다(거래처명만) */
export function buildSummaryPrompt(data: MonthlyReportData): string {
  return [
    '당신은 중소기업 ERP의 월간 경영 리포트 요약을 쓰는 어시스턴트입니다.',
    '아래 JSON의 수치만 근거로 한국어 3~4문장으로 핵심을 요약하세요.',
    '규칙: JSON에 없는 숫자나 원인을 지어내지 않는다. 금액은 원 단위로 쓴다. 과장하지 않고 주의가 필요한 항목(지연, 재고 부족, 결근)을 마지막 문장에서 짚는다.',
    '',
    JSON.stringify(data),
  ].join('\n');
}
