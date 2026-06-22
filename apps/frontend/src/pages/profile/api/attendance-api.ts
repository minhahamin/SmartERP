import { generateAttendance, type AttendanceRecord } from '@/mocks/attendance';
import { delay } from '@/mocks/delay';

/** docs/06-wireframes.md 등 전체 mock 데이터가 기준으로 삼는 고정 "오늘" 날짜 */
export const TODAY = '2026-06-19';
const LATE_THRESHOLD = '09:00';

/** employeeId별 "오늘" 출퇴근 기록만 가변 상태로 보관 — 과거 이력은 결정론적 생성값을 그대로 사용한다. */
const todayOverrides = new Map<string, AttendanceRecord>();

function currentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function diffMinutes(start: string, end: string): number {
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  return Math.max(endHour * 60 + endMinute - (startHour * 60 + startMinute), 0);
}

function emptyTodayRecord(): AttendanceRecord {
  return { date: TODAY, checkInAt: null, checkOutAt: null, status: 'ABSENT', workMinutes: 0 };
}

export async function listMyAttendance(employeeId: string): Promise<AttendanceRecord[]> {
  await delay(250);
  const history = generateAttendance(employeeId)
    .filter((r) => r.date !== TODAY)
    .reverse();
  const today = todayOverrides.get(employeeId) ?? emptyTodayRecord();
  return [today, ...history];
}

export async function checkIn(employeeId: string): Promise<AttendanceRecord> {
  await delay(300);
  const existing = todayOverrides.get(employeeId);
  if (existing?.checkInAt) return existing;

  const checkInAt = currentTime();
  const record: AttendanceRecord = {
    date: TODAY,
    checkInAt,
    checkOutAt: null,
    status: checkInAt > LATE_THRESHOLD ? 'LATE' : 'NORMAL',
    workMinutes: 0,
  };
  todayOverrides.set(employeeId, record);
  return record;
}

export async function checkOut(employeeId: string): Promise<AttendanceRecord> {
  await delay(300);
  const existing = todayOverrides.get(employeeId);
  if (!existing?.checkInAt) {
    throw new Error('출근 기록이 없습니다. 먼저 출근 체크를 해주세요.');
  }
  if (existing.checkOutAt) return existing;

  const checkOutAt = currentTime();
  const record: AttendanceRecord = { ...existing, checkOutAt, workMinutes: diffMinutes(existing.checkInAt, checkOutAt) };
  todayOverrides.set(employeeId, record);
  return record;
}
