export type AttendanceStatus = 'NORMAL' | 'LATE' | 'ABSENT' | 'REMOTE' | 'BUSINESS_TRIP';

export interface AttendanceRecord {
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: AttendanceStatus;
  workMinutes: number;
}

const RECENT_WEEKDAYS = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19'];

/** employeeId를 시드로 한 결정론적 패턴 — 매번 같은 데이터를 반환해 화면 간 일관성을 유지한다. */
export function generateAttendance(employeeId: string): AttendanceRecord[] {
  const seed = employeeId.split('-').pop() ?? '0';
  const seedNum = Number(seed);

  return RECENT_WEEKDAYS.map((date, idx) => {
    const variant = (seedNum + idx) % 5;
    if (variant === 4) {
      return { date, checkInAt: '09:14', checkOutAt: '18:10', status: 'LATE' as const, workMinutes: 476 };
    }
    if (variant === 0 && idx === 2) {
      return { date, checkInAt: null, checkOutAt: null, status: 'REMOTE' as const, workMinutes: 480 };
    }
    return { date, checkInAt: '08:55', checkOutAt: '18:02', status: 'NORMAL' as const, workMinutes: 487 };
  });
}
