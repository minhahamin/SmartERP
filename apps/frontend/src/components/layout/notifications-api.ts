import { apiClient, type ApiSuccess } from '@/lib/api/client';

/** 서버가 자동화 작업에서 새 유형을 추가할 수 있으므로 알려진 값 외의 문자열도 허용한다 */
export type NotificationType = 'INVENTORY' | 'PRODUCTION' | 'LEAVE' | 'PAYROLL' | 'SCHEDULE' | (string & {});

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
