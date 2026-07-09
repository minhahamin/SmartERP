// 헤더 알림 벨(Notification)에 실데이터 기반 더미 알림을 채운다.
// mocks/notifications.ts가 쓰던 정적 텍스트 대신, 실제 DB 상태(안전재고 미달/생산 지연/
// 연차 승인 대기/급여 미확정/오늘 일정)를 조회해 데모 계정별로 의미 있는 알림을 생성한다.
// 재실행해도 중복되지 않도록 대상 사용자의 기존 알림을 지우고 다시 만든다.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_EMAILS = [
  'doyoon.kim@erpilot.io',
  'yujin.choi@erpilot.io',
  'minjun.kim@erpilot.io',
  'jihoon.park@erpilot.io',
] as const;

async function main() {
  const users = await prisma.user.findMany({ where: { email: { in: [...DEMO_EMAILS] } } });
  const userByEmail = new Map(users.map((u) => [u.email, u]));
  const admin = userByEmail.get('doyoon.kim@erpilot.io');
  const hrManager = userByEmail.get('yujin.choi@erpilot.io');
  const salesManager = userByEmail.get('minjun.kim@erpilot.io');
  const employee = userByEmail.get('jihoon.park@erpilot.io');
  if (!admin || !hrManager || !salesManager || !employee) {
    throw new Error('데모 사용자를 찾을 수 없습니다. 먼저 prisma:seed를 실행해주세요.');
  }
  const companyId = admin.companyId;

  await prisma.notification.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });

  const notifications: {
    userId: string;
    type: string;
    title: string;
    message: string;
    link: string | null;
    isRead: boolean;
    createdAt: Date;
  }[] = [];

  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);

  // 1) 안전재고 미달 재고
  const inventories = await prisma.inventory.findMany({
    where: { product: { companyId } },
    include: { product: true },
  });
  const lowStock = inventories.filter((i) => i.quantity <= i.product.safetyStock).slice(0, 3);
  for (const [idx, item] of lowStock.entries()) {
    const notice = {
      type: 'INVENTORY',
      title: '재고 부족 알림',
      message: `${item.product.name} 재고가 안전재고 미달입니다 (${item.quantity}/${item.product.safetyStock}).`,
      link: '/inventory',
      isRead: idx > 0,
      createdAt: hoursAgo(4 + idx * 20),
    };
    notifications.push({ ...notice, userId: admin.id });
    notifications.push({ ...notice, userId: salesManager.id });
  }

  // 2) 생산 지연 오더
  const delayedOrders = await prisma.productionOrder.findMany({
    where: { companyId, status: 'DELAYED' },
    include: { product: true },
    take: 3,
  });
  for (const [idx, order] of delayedOrders.entries()) {
    notifications.push({
      userId: admin.id,
      type: 'PRODUCTION',
      title: '생산 지연',
      message: `${order.orderNo} (${order.product.name}) 오더가 지연 상태입니다.`,
      link: '/production',
      isRead: idx > 0,
      createdAt: hoursAgo(6 + idx * 18),
    });
  }

  // 3) 연차 승인 대기(HR 담당)
  const pendingLeaves = await prisma.leaveRequest.findMany({
    where: { status: 'PENDING', user: { companyId } },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });
  for (const [idx, leave] of pendingLeaves.entries()) {
    notifications.push({
      userId: hrManager.id,
      type: 'LEAVE',
      title: '휴가 승인 대기',
      message: `${leave.user.name}님의 연차 신청이 승인 대기 중입니다.`,
      link: `/employees/${leave.userId}`,
      isRead: idx > 0,
      createdAt: hoursAgo(3 + idx * 15),
    });
  }

  // 4) 급여 미확정(HR/대표)
  const draftPayrolls = await prisma.payroll.count({
    where: { status: 'DRAFT', user: { companyId }, payYear: now.getFullYear(), payMonth: now.getMonth() + 1 },
  });
  if (draftPayrolls > 0) {
    const notice = {
      type: 'PAYROLL',
      title: '급여 확정 필요',
      message: `${now.getFullYear()}년 ${now.getMonth() + 1}월 급여 중 미확정 항목이 ${draftPayrolls}건 있습니다.`,
      link: '/payroll',
      isRead: false,
      createdAt: hoursAgo(30),
    };
    notifications.push({ ...notice, userId: hrManager.id });
    notifications.push({ ...notice, userId: admin.id, isRead: true });
  }

  // 5) 오늘 일정(전 데모 계정 공통 관심사)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const todaySchedules = await prisma.schedule.findMany({
    where: { companyId, startAt: { gte: todayStart, lt: todayEnd } },
    orderBy: { startAt: 'asc' },
    take: 2,
  });
  for (const schedule of todaySchedules) {
    const notice = {
      type: 'SCHEDULE',
      title: '오늘 일정',
      message: `${schedule.title}이(가) ${schedule.startAt.toISOString().slice(11, 16)}에 시작합니다.`,
      link: '/schedule',
      isRead: true,
      createdAt: hoursAgo(2),
    };
    notifications.push({ ...notice, userId: salesManager.id });
    notifications.push({ ...notice, userId: employee.id });
  }

  if (notifications.length === 0) {
    console.log('생성할 실데이터 기반 알림이 없습니다(안전재고 미달/생산 지연/승인 대기 등이 현재 없음).');
    return;
  }

  await prisma.notification.createMany({ data: notifications });
  console.log(`알림 ${notifications.length}건 생성 완료.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
