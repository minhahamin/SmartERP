import { apiClient, type ApiSuccess } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';

export type LeaveType = 'ANNUAL' | 'SICK' | 'SPECIAL' | 'UNPAID';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LeaveRequest {
  id: string;
  userId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
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
  reason: string;
}

export async function submitLeaveRequest(input: SubmitLeaveRequestInput): Promise<LeaveRequest> {
  const { data } = await apiClient.post<ApiSuccess<RawLeaveRequest>>('/leave-requests', {
    type: input.type,
    startDate: input.startDate,
    endDate: input.endDate,
    reason: input.reason,
  });
  return toLeaveRequest(data.data);
}
