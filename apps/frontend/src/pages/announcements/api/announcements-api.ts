import { apiClient, type ApiSuccess } from '@/lib/api/client';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string | null;
  isPinned: boolean;
  targetRoleId: string | null;
  authorId: string;
  publishedAt: string;
  isReadByMe: boolean;
  readCount: number;
  totalTargetCount: number;
}

export async function listAnnouncements(): Promise<Announcement[]> {
  const { data } = await apiClient.get<ApiSuccess<Announcement[]>>('/announcements');
  return data.data;
}

export interface AnnouncementInput {
  title: string;
  content: string;
  isPinned: boolean;
  /** 비워두면 전사 공개 */
  targetRoleId?: string;
}

export async function createAnnouncement(input: AnnouncementInput) {
  const { data } = await apiClient.post<ApiSuccess<{ id: string }>>('/announcements', input);
  return data.data;
}

export async function updateAnnouncement(id: string, input: AnnouncementInput) {
  const { data } = await apiClient.patch<ApiSuccess<{ id: string }>>(`/announcements/${id}`, input);
  return data.data;
}

export async function markAnnouncementRead(id: string): Promise<void> {
  await apiClient.post(`/announcements/${id}/read`);
}
