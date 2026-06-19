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
