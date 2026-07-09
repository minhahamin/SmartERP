import { apiClient, type ApiSuccess } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import type { LeaveType } from '@/pages/profile/api/leave-api';

export type AttendanceStatus = 'NORMAL' | 'LATE' | 'ABSENT' | 'REMOTE' | 'BUSINESS_TRIP' | 'ON_LEAVE';

export interface AttendanceLeaveOverlay {
  type: LeaveType;
  label: string;
  startTime: string | null;
  endTime: string | null;
}

export interface AttendanceRecord {
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: AttendanceStatus;
  workMinutes: number;
  /** 그날 승인된 연차/반차 등이 있으면 채워진다(내 근태 탭에 겹쳐서 보여주기 위함) */
  leave: AttendanceLeaveOverlay | null;
}

interface RawAttendance {
  id: string;
  userId: string;
  workDate: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: AttendanceStatus;
  workMinutes: number | null;
  /** /attendances/me(이력 조회)에만 포함되고, check-in/check-out 응답에는 없다 */
  leave?: AttendanceLeaveOverlay | null;
}

/** 한국 표준시는 DST 없이 UTC+9로 고정 — 백엔드 attendance.service.ts의 todayDateOnly()와 동일한 기준을 써야
 * 자정 근처(KST 00:00~09:00)에 "오늘" 날짜가 서버/클라이언트에서 어긋나지 않는다(브라우저 로컬 타임존과도 무관). */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function todayDateString(): string {
  return new Date(Date.now() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

function toTimeString(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function mapAttendance(raw: RawAttendance): AttendanceRecord {
  return {
    date: raw.workDate.slice(0, 10),
    checkInAt: toTimeString(raw.checkInAt),
    checkOutAt: toTimeString(raw.checkOutAt),
    status: raw.status,
    workMinutes: raw.workMinutes ?? 0,
    leave: raw.leave ?? null,
  };
}

export async function listMyAttendance(employeeId: string): Promise<AttendanceRecord[]> {
  const currentUserId = useAuthStore.getState().user?.id;
  const { data } =
    employeeId === currentUserId
      ? await apiClient.get<ApiSuccess<RawAttendance[]>>('/attendances/me')
      : await apiClient.get<ApiSuccess<RawAttendance[]>>('/attendances', { params: { userId: employeeId, limit: 100 } });

  const records = data.data.map(mapAttendance);
  const today = todayDateString();
  if (records.some((r) => r.date === today)) return records;
  return [{ date: today, checkInAt: null, checkOutAt: null, status: 'ABSENT', workMinutes: 0, leave: null }, ...records];
}

export async function checkIn(): Promise<AttendanceRecord> {
  const { data } = await apiClient.post<ApiSuccess<RawAttendance>>('/attendances/check-in');
  return mapAttendance(data.data);
}

export async function checkOut(): Promise<AttendanceRecord> {
  const { data } = await apiClient.post<ApiSuccess<RawAttendance>>('/attendances/check-out');
  return mapAttendance(data.data);
}
