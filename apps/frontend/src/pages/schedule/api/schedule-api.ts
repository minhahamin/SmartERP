import { apiClient, type ApiSuccess } from '@/lib/api/client';

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

export interface CreateScheduleInput {
  title: string;
  type: ScheduleType;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  visibility: ScheduleVisibility;
  ownerId: string;
}

export type UpdateScheduleInput = Omit<CreateScheduleInput, 'ownerId'>;

interface RawSchedule {
  id: string;
  title: string;
  type: ScheduleType;
  startAt: string;
  endAt: string;
  location: string | null;
  ownerId: string;
  visibility: ScheduleVisibility;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** 백엔드는 startAt/endAt(ISO datetime) 단일 필드를 쓰지만, 기존 UI는 date/startTime/endTime로 분리되어 있어 여기서 변환한다 */
function toScheduleEvent(raw: RawSchedule): ScheduleEvent {
  const start = new Date(raw.startAt);
  const end = new Date(raw.endAt);
  return {
    id: raw.id,
    title: raw.title,
    type: raw.type,
    date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
    location: raw.location ?? '-',
    ownerId: raw.ownerId,
    visibility: raw.visibility,
  };
}

function toRequestBody(input: CreateScheduleInput | UpdateScheduleInput) {
  return {
    title: input.title,
    type: input.type,
    startAt: new Date(`${input.date}T${input.startTime}`).toISOString(),
    endAt: new Date(`${input.date}T${input.endTime}`).toISOString(),
    location: input.location || undefined,
    visibility: input.visibility,
  };
}

function monthRange(year: number, month: number) {
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${pad(month)}-01T00:00:00`,
    to: `${year}-${pad(month)}-${pad(lastDay)}T23:59:59`,
  };
}

export async function listSchedulesByMonth(year: number, month: number): Promise<ScheduleEvent[]> {
  const { data } = await apiClient.get<ApiSuccess<RawSchedule[]>>('/schedules', { params: monthRange(year, month) });
  return data.data.map(toScheduleEvent);
}

export async function createSchedule(input: CreateScheduleInput): Promise<ScheduleEvent> {
  const { data } = await apiClient.post<ApiSuccess<RawSchedule>>('/schedules', toRequestBody(input));
  return toScheduleEvent(data.data);
}

export async function updateSchedule(id: string, input: UpdateScheduleInput): Promise<ScheduleEvent> {
  const { data } = await apiClient.patch<ApiSuccess<RawSchedule>>(`/schedules/${id}`, toRequestBody(input));
  return toScheduleEvent(data.data);
}

export async function deleteSchedule(id: string): Promise<void> {
  await apiClient.delete(`/schedules/${id}`);
}
