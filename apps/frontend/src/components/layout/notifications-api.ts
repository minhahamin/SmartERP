import { apiClient, type ApiSuccess } from '@/lib/api/client';

export type NotificationType = 'INVENTORY' | 'PRODUCTION' | 'LEAVE' | 'PAYROLL' | 'SCHEDULE';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export async function listNotifications(): Promise<AppNotification[]> {
  const { data } = await apiClient.get<ApiSuccess<AppNotification[]>>('/notifications');
  return data.data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post('/notifications/read-all');
}
