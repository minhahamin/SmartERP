import { ANNOUNCEMENTS, type Announcement } from '@/mocks/announcements';
import { delay } from '@/mocks/delay';

let announcementDb: Announcement[] = [...ANNOUNCEMENTS];
const readByCurrentSession = new Set<string>();

export async function listAnnouncements(): Promise<Announcement[]> {
  await delay();
  return [...announcementDb].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return a.publishedAt < b.publishedAt ? 1 : -1;
  });
}

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  scope: string;
  isPinned: boolean;
  authorId: string;
}

export async function createAnnouncement(input: CreateAnnouncementInput): Promise<Announcement> {
  await delay(400);
  const announcement: Announcement = {
    id: `ann-${Date.now()}`,
    readCount: 0,
    totalTargetCount: 15,
    publishedAt: '2026-06-19',
    ...input,
  };
  announcementDb = [announcement, ...announcementDb];
  return announcement;
}

export async function markAnnouncementRead(id: string): Promise<Announcement> {
  await delay(150);
  if (!readByCurrentSession.has(id)) {
    readByCurrentSession.add(id);
    announcementDb = announcementDb.map((a) => (a.id === id ? { ...a, readCount: Math.min(a.readCount + 1, a.totalTargetCount) } : a));
  }
  const updated = announcementDb.find((a) => a.id === id);
  if (!updated) throw new Error('공지사항을 찾을 수 없습니다.');
  return updated;
}
