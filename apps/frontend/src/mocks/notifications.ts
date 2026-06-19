export type NotificationType = 'INVENTORY' | 'PRODUCTION' | 'LEAVE' | 'PAYROLL' | 'SCHEDULE';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

export const NOTIFICATIONS: AppNotification[] = [
  {
    id: 'noti-1',
    type: 'INVENTORY',
    title: '재고 부족 알림',
    message: '패킹박스 L 재고가 안전재고 미달입니다 (15/50).',
    link: '/inventory',
    isRead: false,
    createdAt: '2026-06-19T08:10:00',
  },
  {
    id: 'noti-2',
    type: 'PRODUCTION',
    title: '생산 지연',
    message: 'PO-2026-012 (고무 패킹) 오더가 지연 상태입니다.',
    link: '/production',
    isRead: false,
    createdAt: '2026-06-18T17:40:00',
  },
  {
    id: 'noti-3',
    type: 'LEAVE',
    title: '휴가 승인 대기',
    message: '오세훈님의 연차 신청이 승인 대기 중입니다.',
    link: '/employees/emp-1102',
    isRead: false,
    createdAt: '2026-06-17T11:00:00',
  },
  {
    id: 'noti-4',
    type: 'PAYROLL',
    title: '급여 확정 필요',
    message: '2026년 6월 급여 중 미확정 항목이 있습니다.',
    link: '/payroll',
    isRead: true,
    createdAt: '2026-06-15T09:00:00',
  },
  {
    id: 'noti-5',
    type: 'SCHEDULE',
    title: '오늘 일정',
    message: '주간 영업 회의가 10:00에 시작합니다.',
    link: '/schedule',
    isRead: true,
    createdAt: '2026-06-18T07:00:00',
  },
];
