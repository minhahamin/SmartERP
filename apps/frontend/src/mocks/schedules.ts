export type ScheduleType = 'MEETING' | 'VACATION' | 'BUSINESS_TRIP' | 'ETC';
export type ScheduleVisibility = 'PRIVATE' | 'DEPARTMENT' | 'COMPANY';

export interface ScheduleEvent {
  id: string;
  title: string;
  type: ScheduleType;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  ownerId: string;
  visibility: ScheduleVisibility;
}

export const SCHEDULE_TYPE_LABEL: Record<ScheduleType, string> = {
  MEETING: '회의',
  VACATION: '휴가',
  BUSINESS_TRIP: '출장',
  ETC: '기타',
};

export const SCHEDULES: ScheduleEvent[] = [
  { id: 'sch-1', title: '신제품 기획 회의', type: 'MEETING', date: '2026-06-02', startTime: '14:00', endTime: '15:30', location: '3층 회의실', ownerId: 'emp-1024', visibility: 'DEPARTMENT' },
  { id: 'sch-2', title: '한빛전자 출장', type: 'BUSINESS_TRIP', date: '2026-06-05', startTime: '09:00', endTime: '18:00', location: '경기도 화성시', ownerId: 'emp-1024', visibility: 'DEPARTMENT' },
  { id: 'sch-3', title: '주간 영업 회의', type: 'MEETING', date: '2026-06-08', startTime: '10:00', endTime: '11:00', location: '3층 회의실', ownerId: 'emp-1024', visibility: 'COMPANY' },
  { id: 'sch-4', title: '휴가 — 박지훈 (연차)', type: 'VACATION', date: '2026-06-10', startTime: '00:00', endTime: '23:59', location: '-', ownerId: 'emp-1031', visibility: 'COMPANY' },
  { id: 'sch-5', title: '6월 월간보고', type: 'MEETING', date: '2026-06-16', startTime: '15:00', endTime: '16:00', location: '대회의실', ownerId: 'emp-1000', visibility: 'COMPANY' },
  { id: 'sch-6', title: '주간 영업 회의', type: 'MEETING', date: '2026-06-18', startTime: '10:00', endTime: '11:00', location: '3층 회의실', ownerId: 'emp-1024', visibility: 'COMPANY' },
  { id: 'sch-7', title: '휴가 — 이서연 (연차)', type: 'VACATION', date: '2026-06-18', startTime: '00:00', endTime: '23:59', location: '-', ownerId: 'emp-1025', visibility: 'COMPANY' },
  { id: 'sch-8', title: '거래처 방문 (대한물산)', type: 'BUSINESS_TRIP', date: '2026-06-18', startTime: '14:00', endTime: '17:00', location: '서울 영등포구', ownerId: 'emp-1024', visibility: 'DEPARTMENT' },
  { id: 'sch-9', title: '하반기 워크숍 준비', type: 'ETC', date: '2026-06-22', startTime: '13:00', endTime: '14:00', location: '경영지원팀', ownerId: 'emp-1106', visibility: 'COMPANY' },
  { id: 'sch-10', title: '삼진산업 방문', type: 'BUSINESS_TRIP', date: '2026-06-24', startTime: '10:00', endTime: '16:00', location: '부산광역시', ownerId: 'emp-1101', visibility: 'DEPARTMENT' },
  { id: 'sch-11', title: '생산 설비 점검 회의', type: 'MEETING', date: '2026-06-25', startTime: '09:30', endTime: '10:30', location: '생산동 회의실', ownerId: 'emp-1031', visibility: 'DEPARTMENT' },
  { id: 'sch-12', title: '휴가 — 정하늘 (연차)', type: 'VACATION', date: '2026-06-29', startTime: '00:00', endTime: '23:59', location: '-', ownerId: 'emp-1077', visibility: 'COMPANY' },
];
