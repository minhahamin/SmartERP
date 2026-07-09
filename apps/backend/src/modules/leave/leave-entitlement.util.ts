/**
 * 근로기준법 제60조(연차 유급휴가) 기준 연차 발생일수 계산.
 * - 근속 1년 미만: 입사 후 매월 개근 시 1일씩 발생(최대 11일, 제60조 2항)
 * - 근속 1년 이상: 15일 + 최초 1년을 초과하는 매 2년마다 1일 가산, 최대 25일(제60조 4항)
 * 이 데모는 결근/지각 이력을 연차 산정에 반영하지 않고 매월 개근을 가정한다.
 */
export function calculateAnnualLeaveEntitlement(hireDate: Date | null | undefined, asOf: Date): number {
  if (!hireDate || hireDate > asOf) return 0;

  const fullMonths = monthsBetween(hireDate, asOf);
  const fullYears = Math.floor(fullMonths / 12);

  if (fullYears < 1) return Math.min(fullMonths, 11);
  return Math.min(15 + Math.floor((fullYears - 1) / 2), 25);
}

function monthsBetween(start: Date, end: Date): number {
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  return Math.max(months, 0);
}
