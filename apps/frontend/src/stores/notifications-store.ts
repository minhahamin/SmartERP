import { create } from 'zustand';
import { NOTIFICATIONS, type AppNotification } from '@/mocks/notifications';

interface NotificationsState {
  notifications: AppNotification[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

/**
 * 헤더 알림 벨은 페이지별 데이터가 아니라 전역 셸의 관심사이므로
 * React Query 모듈이 아닌 Zustand 스토어로 관리한다(ui-store.ts와 동일한 패턴).
 */
export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: NOTIFICATIONS,
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    })),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
    })),
}));
