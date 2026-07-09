import type { LeaveType } from '@prisma/client';

/** 시간반차(HOURLY)는 2시간 단위 고정 구간 중 하나를 선택해 신청한다(구간당 0.25일 차감) */
export const HOURLY_TIME_SLOTS = ['09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00'] as const;
export type HourlyTimeSlot = (typeof HOURLY_TIME_SLOTS)[number];

export const HALF_DAY_AM_WINDOW = { startTime: '09:00', endTime: '14:00' } as const;
export const HALF_DAY_PM_WINDOW = { startTime: '14:00', endTime: '18:00' } as const;

/** leave.service.ts(일정 제목)와 attendance.service.ts(근태 탭 휴가 오버레이)가 함께 쓰는 라벨 */
export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  ANNUAL: '연차',
  HALF_DAY_AM: '오전반차',
  HALF_DAY_PM: '오후반차',
  HOURLY: '시간반차',
  SICK: '병가',
  SPECIAL: '경조사',
  UNPAID: '무급휴가',
};
