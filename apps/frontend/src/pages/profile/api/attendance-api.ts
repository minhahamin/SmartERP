import { apiClient, type ApiSuccess } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';

export type AttendanceStatus = 'NORMAL' | 'LATE' | 'ABSENT' | 'REMOTE' | 'BUSINESS_TRIP';

export interface AttendanceRecord {
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: AttendanceStatus;
  workMinutes: number;
}

interface RawAttendance {
  id: string;
  userId: string;
  workDate: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: AttendanceStatus;
  workMinutes: number | null;
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
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
  return [{ date: today, checkInAt: null, checkOutAt: null, status: 'ABSENT', workMinutes: 0 }, ...records];
}

export async function checkIn(): Promise<AttendanceRecord> {
  const { data } = await apiClient.post<ApiSuccess<RawAttendance>>('/attendances/check-in');
  return mapAttendance(data.data);
}

export async function checkOut(): Promise<AttendanceRecord> {
  const { data } = await apiClient.post<ApiSuccess<RawAttendance>>('/attendances/check-out');
  return mapAttendance(data.data);
}
