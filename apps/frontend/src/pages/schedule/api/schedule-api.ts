import { SCHEDULES, type ScheduleEvent, type ScheduleType, type ScheduleVisibility } from '@/mocks/schedules';
import { delay } from '@/mocks/delay';

let scheduleDb: ScheduleEvent[] = [...SCHEDULES];

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

export async function listSchedulesByMonth(year: number, month: number): Promise<ScheduleEvent[]> {
  await delay(300);
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return scheduleDb.filter((e) => e.date.startsWith(prefix));
}

export async function createSchedule(input: CreateScheduleInput): Promise<ScheduleEvent> {
  await delay(400);
  const event: ScheduleEvent = { id: `sch-${Date.now()}`, ...input };
  scheduleDb = [...scheduleDb, event];
  return event;
}

export async function updateSchedule(id: string, input: UpdateScheduleInput): Promise<ScheduleEvent> {
  await delay(400);
  scheduleDb = scheduleDb.map((e) => (e.id === id ? { ...e, ...input } : e));
  const updated = scheduleDb.find((e) => e.id === id);
  if (!updated) throw new Error('일정을 찾을 수 없습니다.');
  return updated;
}

export async function deleteSchedule(id: string): Promise<void> {
  await delay(350);
  scheduleDb = scheduleDb.filter((e) => e.id !== id);
}
