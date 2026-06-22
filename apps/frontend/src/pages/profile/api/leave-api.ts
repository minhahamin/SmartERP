import { LEAVE_REQUESTS, type LeaveRequest, type LeaveType } from '@/mocks/leave';
import { delay } from '@/mocks/delay';

let leaveRequestDb: LeaveRequest[] = [...LEAVE_REQUESTS];

export async function listLeaveRequests(employeeId: string): Promise<LeaveRequest[]> {
  await delay(250);
  return leaveRequestDb
    .filter((r) => r.employeeId === employeeId)
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
}

export interface SubmitLeaveRequestInput {
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

function countInclusiveDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(diff, 1);
}

export async function submitLeaveRequest(input: SubmitLeaveRequestInput): Promise<LeaveRequest> {
  await delay(400);
  const request: LeaveRequest = {
    id: `lr-${Date.now()}`,
    days: countInclusiveDays(input.startDate, input.endDate),
    status: 'PENDING',
    ...input,
  };
  leaveRequestDb = [request, ...leaveRequestDb];
  return request;
}
