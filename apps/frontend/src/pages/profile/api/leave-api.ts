import { apiClient, type ApiSuccess } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';

export type LeaveType = 'ANNUAL' | 'HALF_DAY_AM' | 'HALF_DAY_PM' | 'HOURLY' | 'SICK' | 'SPECIAL' | 'UNPAID';

/** 오전반차/오후반차/시간반차는 하루 단위 고정 일수(반차 0.5일, 시간반차 2시간=0.25일)로 신청한다 */
export const FIXED_FRACTION_LEAVE_TYPES: LeaveType[] = ['HALF_DAY_AM', 'HALF_DAY_PM', 'HOURLY'];

/** 시간반차는 2시간 단위 고정 구간 중 하나를 선택한다(구간당 0.25일 차감) — 백엔드 leave-constants.ts와 동일 */
export const HOURLY_TIME_SLOTS = ['09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00'] as const;

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LeaveRequest {
  id: string;
  userId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  days: number;
  reason: string | null;
  status: LeaveStatus;
}

interface RawLeaveRequest extends Omit<LeaveRequest, 'days'> {
  days: string | number;
}

/** Prisma Decimal(days)은 JSON으로 문자열화되어 내려오므로 숫자로 변환한다 */
function toLeaveRequest(raw: RawLeaveRequest): LeaveRequest {
  return { ...raw, days: Number(raw.days) };
}

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  ANNUAL: '연차',
  HALF_DAY_AM: '오전반차',
  HALF_DAY_PM: '오후반차',
  HOURLY: '시간반차',
  SICK: '병가',
  SPECIAL: '경조사',
  UNPAID: '무급휴가',
};

export interface LeaveBalance {
  userId: string;
  year: number;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
}

export async function listLeaveRequests(employeeId: string): Promise<LeaveRequest[]> {
  const currentUserId = useAuthStore.getState().user?.id;
  const { data } =
    employeeId === currentUserId
      ? await apiClient.get<ApiSuccess<RawLeaveRequest[]>>('/leave-requests/me')
      : await apiClient.get<ApiSuccess<RawLeaveRequest[]>>('/leave-requests', { params: { userId: employeeId, limit: 100 } });
  return data.data.map(toLeaveRequest);
}

export async function fetchLeaveBalance(employeeId: string): Promise<LeaveBalance> {
  const currentUserId = useAuthStore.getState().user?.id;
  const url = employeeId === currentUserId ? '/leave-balances/me' : `/leave-balances/${employeeId}`;
  const { data } = await apiClient.get<ApiSuccess<LeaveBalance>>(url);
  return data.data;
}

export interface SubmitLeaveRequestInput {
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  /** type이 HOURLY일 때만 필요(예: "09:00-11:00") */
  timeSlot?: string;
  reason: string;
}

export async function submitLeaveRequest(input: SubmitLeaveRequestInput): Promise<LeaveRequest> {
  const { data } = await apiClient.post<ApiSuccess<RawLeaveRequest>>('/leave-requests', {
    type: input.type,
    startDate: input.startDate,
    endDate: input.endDate,
    timeSlot: input.timeSlot,
    reason: input.reason,
  });
  return toLeaveRequest(data.data);
}
