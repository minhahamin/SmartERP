export type LeaveType = 'ANNUAL' | 'SICK' | 'SPECIAL' | 'UNPAID';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
}

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  ANNUAL: '연차',
  SICK: '병가',
  SPECIAL: '경조사',
  UNPAID: '무급휴가',
};

export const LEAVE_REQUESTS: LeaveRequest[] = [
  { id: 'lr-1', employeeId: 'emp-1025', type: 'ANNUAL', startDate: '2026-06-18', endDate: '2026-06-18', days: 1, reason: '개인 사정', status: 'APPROVED' },
  { id: 'lr-2', employeeId: 'emp-1031', type: 'ANNUAL', startDate: '2026-06-10', endDate: '2026-06-10', days: 1, reason: '개인 사정', status: 'APPROVED' },
  { id: 'lr-3', employeeId: 'emp-1077', type: 'SICK', startDate: '2026-05-20', endDate: '2026-06-19', days: 30, reason: '병가 휴직', status: 'APPROVED' },
  { id: 'lr-4', employeeId: 'emp-1102', type: 'ANNUAL', startDate: '2026-06-26', endDate: '2026-06-27', days: 2, reason: '여행', status: 'PENDING' },
  { id: 'lr-5', employeeId: 'emp-1024', type: 'ANNUAL', startDate: '2026-07-06', endDate: '2026-07-08', days: 3, reason: '여름 휴가', status: 'PENDING' },
];

export const LEAVE_BALANCE: Record<string, { total: number; used: number }> = {
  'emp-1000': { total: 15, used: 3 },
  'emp-1024': { total: 18, used: 9.5 },
  'emp-1025': { total: 16, used: 7.5 },
  'emp-1031': { total: 15, used: 6 },
  'emp-1042': { total: 17, used: 5 },
  'emp-1077': { total: 15, used: 15 },
  'emp-1090': { total: 15, used: 12 },
  'emp-1101': { total: 16, used: 4 },
  'emp-1102': { total: 15, used: 6.5 },
  'emp-1103': { total: 15, used: 2 },
  'emp-1104': { total: 14, used: 3 },
  'emp-1105': { total: 14, used: 1 },
  'emp-1106': { total: 15, used: 4.5 },
  'emp-1107': { total: 13, used: 2 },
  'emp-1108': { total: 13, used: 0 },
};

export function getLeaveBalance(employeeId: string) {
  const balance = LEAVE_BALANCE[employeeId] ?? { total: 15, used: 0 };
  return { ...balance, remaining: Math.round((balance.total - balance.used) * 10) / 10 };
}

export function getLeaveRequestsByEmployee(employeeId: string) {
  return LEAVE_REQUESTS.filter((r) => r.employeeId === employeeId);
}
