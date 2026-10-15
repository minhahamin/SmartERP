// 데모 시드(seed-demo-data.ts / seed-demo-data-h2.ts)는 달력이 고정(5~12월)이라
// 앱이 쓰는 실제 시계(대시보드 "이번 달", AI "오늘" 등)와 어긋난다.
// 예: 12월 날짜인데 이미 "출고완료"인 수주, 마감일이 안 지났는데 "지연"인 생산 오더, 10월 급여가 이미 "지급완료".
// 이 스크립트는 "오늘(KST)" 기준으로 모순된 레코드만 바로잡는다. 여러 번 실행해도 결과가 같다(멱등).
//
//   npm run prisma:normalize-demo
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

async function main() {
  const now = new Date();
  const kstNow = new Date(now.getTime() + KST_OFFSET_MS);
  const todayStr = kstNow.toISOString().slice(0, 10);
  // @db.Date 컬럼과 비교하기 위한 UTC 자정 값
  const today = new Date(`${todayStr}T00:00:00.000Z`);
  const payYear = kstNow.getUTCFullYear();
  const payMonth = kstNow.getUTCMonth() + 1;

  console.log(`[normalize] 기준일(KST): ${todayStr}`);

  await prisma.$transaction(async (tx) => {
    // 1) 수주 — 아직 오지 않은 주문일의 수주는 존재할 수 없다(품목은 onDelete: Cascade)
    const orders = await tx.salesOrder.deleteMany({ where: { orderDate: { gt: today } } });

    // 2) 입출고 이력 — 미래 시각의 이력 제거
    const movements = await tx.stockMovement.deleteMany({ where: { createdAt: { gt: now } } });

    // 3) 근태 — 미래 날짜의 출퇴근 기록 제거
    const attendances = await tx.attendance.deleteMany({ where: { workDate: { gt: today } } });

    // 4) 생산 오더 — 시작 전이면 계획, 마감이 지났는데 미완료면 지연, 마감 전인데 지연이면 진행중
    const notStarted = await tx.productionOrder.updateMany({
      where: { startDate: { gt: today }, NOT: { status: 'PLANNED', producedQty: 0 } },
      data: { status: 'PLANNED', producedQty: 0 },
    });
    const overdue = await tx.productionOrder.updateMany({
      where: { startDate: { lte: today }, dueDate: { lt: today }, status: { in: ['PLANNED', 'IN_PROGRESS'] } },
      data: { status: 'DELAYED' },
    });
    const notOverdue = await tx.productionOrder.updateMany({
      where: { startDate: { lte: today }, dueDate: { gte: today }, status: 'DELAYED' },
      data: { status: 'IN_PROGRESS' },
    });

    // 4-1) 데모 화면이 "전부 지연"으로 치우치지 않도록, 이미 진행률이 있는 지연 오더 중
    //      가장 오래된 1건은 지연으로 남기고 나머지 최대 2건은 마감일을 앞으로 밀어 진행중으로 되돌린다.
    //      (되돌린 뒤에는 지연 오더가 1건뿐이라 재실행해도 더 이상 바뀌지 않는다)
    const delayedWithProgress = await tx.productionOrder.findMany({
      where: { status: 'DELAYED', producedQty: { gt: 0 }, startDate: { lte: today } },
      orderBy: { dueDate: 'asc' },
    });
    const recovered = delayedWithProgress.slice(1, 3);
    for (const [index, order] of recovered.entries()) {
      const dueDate = new Date(today);
      dueDate.setUTCDate(dueDate.getUTCDate() + 7 * (index + 1));
      await tx.productionOrder.update({ where: { id: order.id }, data: { status: 'IN_PROGRESS', dueDate } });
    }

    // 4-2) 입고 창고가 없는 미완료 오더는 완료 처리가 불가능하다("입고 창고를 먼저 지정" 400).
    //      데모에서 어떤 오더도 완료할 수 없지 않도록 회사의 "본사 창고"(없으면 첫 창고)를 지정한다.
    let warehousesAssigned = 0;
    for (const company of await tx.company.findMany({ select: { id: true } })) {
      const warehouse =
        (await tx.warehouse.findFirst({ where: { companyId: company.id, name: '본사 창고' } })) ??
        (await tx.warehouse.findFirst({ where: { companyId: company.id }, orderBy: { name: 'asc' } }));
      if (!warehouse) continue;
      const assigned = await tx.productionOrder.updateMany({
        where: { companyId: company.id, warehouseId: null, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        data: { warehouseId: warehouse.id },
      });
      warehousesAssigned += assigned.count;
    }

    // 4-3) 재고 화면의 "최근 변동일"(updatedAt)이 시드 시점에 멈춰 입출고 이력과 어긋나므로 마지막 이력 시각에 맞춘다
    const inventoryDates = await tx.$executeRaw`
      UPDATE inventories i
      SET "updatedAt" = m.last_at
      FROM (
        SELECT "productId", "warehouseId", MAX("createdAt") AS last_at
        FROM stock_movements
        GROUP BY "productId", "warehouseId"
      ) m
      WHERE m."productId" = i."productId"
        AND m."warehouseId" = i."warehouseId"
        AND i."updatedAt" <> m.last_at
    `;

    // 5) 급여 — 지난 달까지는 지급완료, 이번 달은 초안, 이후 달은 존재할 수 없다
    const futurePayrolls = await tx.payroll.deleteMany({
      where: { OR: [{ payYear: { gt: payYear } }, { payYear, payMonth: { gt: payMonth } }] },
    });
    const currentPayrolls = await tx.payroll.updateMany({
      where: { payYear, payMonth, NOT: { status: 'DRAFT' } },
      data: { status: 'DRAFT', confirmedAt: null, paidAt: null },
    });
    const pastPayrolls = await tx.payroll.updateMany({
      where: { OR: [{ payYear: { lt: payYear } }, { payYear, payMonth: { lt: payMonth } }], status: { not: 'PAID' } },
      data: { status: 'PAID', confirmedAt: now, paidAt: now },
    });

    // 6) 공지/알림 — 미래 게시/생성 시각은 지금으로 당긴다
    const announcements = await tx.announcement.updateMany({
      where: { publishedAt: { gt: now } },
      data: { publishedAt: now },
    });
    const notifications = await tx.notification.updateMany({
      where: { createdAt: { gt: now } },
      data: { createdAt: now },
    });

    console.log('[normalize] 삭제:', {
      salesOrders: orders.count,
      stockMovements: movements.count,
      attendances: attendances.count,
      payrolls: futurePayrolls.count,
    });
    console.log('[normalize] 수정:', {
      productionNotStarted: notStarted.count,
      productionOverdue: overdue.count,
      productionNotOverdue: notOverdue.count,
      productionRecoveredToInProgress: recovered.length,
      productionWarehousesAssigned: warehousesAssigned,
      inventoryDatesAligned: inventoryDates,
      payrollCurrentMonthToDraft: currentPayrolls.count,
      payrollPastToPaid: pastPayrolls.count,
      announcements: announcements.count,
      notifications: notifications.count,
    });
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
