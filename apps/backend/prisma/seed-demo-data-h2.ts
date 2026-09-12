// seed.ts + seed-demo-data.ts(5~7월 데이터)가 이미 실행된 뒤에 돌리는 2차 후속 시드.
// 8~12월 데이터를 "이미 지나간 실제 운영 이력"처럼 채운다(문서관리 모듈은 제외).
// 기존 마스터 데이터(직원 13명/거래처 8개/제품 12개)를 그대로 재사용하고,
// 근태/휴가/급여/일정/수주/생산/입출고/공지/알림만 8~12월 범위로 추가한다.
// 최상단에서 "이미 실행됐는지"를 attendance의 8월 이후 존재 여부로 한 번만 판단한다
// (섹션 간 의존성이 커서 원본처럼 섹션별 가드를 두지 않고 전체를 한 번에 건너뛴다).
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COMPANY_BIZ_REG_NO = '123-45-67890';

const LEAVE_LABEL: Record<string, string> = {
  ANNUAL: '연차',
  HALF_DAY_AM: '오전반차',
  HALF_DAY_PM: '오후반차',
  HOURLY: '시간반차',
  SICK: '병가',
  SPECIAL: '경조사',
  UNPAID: '무급휴가',
};
const ANNUAL_CONSUMING_TYPES = new Set(['ANNUAL', 'HALF_DAY_AM', 'HALF_DAY_PM', 'HOURLY']);

function kst(dateStr: string, time: string): Date {
  return new Date(`${dateStr}T${time}:00+09:00`);
}
function dateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}
function businessDaysInRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${startStr}T00:00:00Z`);
  const end = new Date(`${endStr}T00:00:00Z`);
  while (cursor <= end) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}
function inRange(dateStr: string, start: string, end: string): boolean {
  return dateStr >= start && dateStr <= end;
}
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}
/** leave.service.ts의 resolveScheduleWindow와 동일한 규칙 — 반차/시간반차는 그 시간대, 나머지는 종일(다음날 00:00 배타적 경계) */
function scheduleWindowForLeave(start: string, end: string, startTime?: string, endTime?: string) {
  if (startTime && endTime) {
    return { startAt: kst(start, startTime), endAt: kst(start, endTime), allDay: false };
  }
  const endExclusive = new Date(`${end}T00:00:00Z`);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  return { startAt: dateOnly(start), endAt: endExclusive, allDay: true };
}

async function main() {
  const company = await prisma.company.findUnique({ where: { bizRegNo: COMPANY_BIZ_REG_NO } });
  if (!company) throw new Error('prisma/seed.ts를 먼저 실행해 회사/기본 계정을 만들어주세요.');
  const companyId = company.id;

  const alreadyRan = await prisma.attendance.count({ where: { workDate: { gte: dateOnly('2026-08-01') } } });
  if (alreadyRan > 0) {
    console.log('8월 이후 데이터가 이미 존재합니다 — 전체 스크립트를 건너뜁니다.');
    return;
  }

  const departments = await prisma.department.findMany({ where: { companyId } });
  const deptIdByName = new Map(departments.map((d) => [d.name, d.id]));
  const warehouses = await prisma.warehouse.findMany({ where: { companyId } });
  const whByName = new Map(warehouses.map((w) => [w.name, w.id]));
  const mainWarehouseId = whByName.get('본사 창고')!;
  const subWarehouseId = whByName.get('경기 물류창고')!;

  const allUsers = await prisma.user.findMany({ where: { companyId } });
  const userByName = new Map(allUsers.map((x) => [x.name, x]));
  const u = (name: string) => {
    const found = userByName.get(name);
    if (!found) throw new Error(`유저를 찾을 수 없음: ${name}`);
    return found;
  };

  const partners = await prisma.partner.findMany({ where: { companyId } });
  const partnerByName = new Map(partners.map((p) => [p.name, p.id]));
  const products = await prisma.product.findMany({ where: { companyId } });
  const productBySku = new Map(products.map((p) => [p.sku, p]));

  // ── 1. 휴가 신청 (8~12월) ──
  type LeaveSeed = {
    name: string;
    type: 'ANNUAL' | 'HALF_DAY_AM' | 'HALF_DAY_PM' | 'HOURLY' | 'SICK' | 'SPECIAL' | 'UNPAID';
    start: string;
    end: string;
    startTime?: string;
    endTime?: string;
    days: number;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    approver?: string;
  };
  const LEAVE_REQUESTS: LeaveSeed[] = [
    { name: '이수민', type: 'ANNUAL', start: '2026-08-05', end: '2026-08-06', days: 2, reason: '여름 휴가', status: 'APPROVED', approver: '최유진' },
    { name: '박지훈', type: 'SICK', start: '2026-08-14', end: '2026-08-14', days: 1, reason: '몸살감기', status: 'APPROVED', approver: '최유진' },
    { name: '윤태양', type: 'ANNUAL', start: '2026-08-24', end: '2026-08-24', days: 1, reason: '개인 사유', status: 'APPROVED', approver: '최유진' },
    { name: '강지민', type: 'HALF_DAY_PM', start: '2026-09-09', end: '2026-09-09', startTime: '13:00', endTime: '18:00', days: 0.5, reason: '병원 방문', status: 'APPROVED', approver: '김민준' },
    { name: '조민재', type: 'ANNUAL', start: '2026-09-21', end: '2026-09-22', days: 2, reason: '가족 여행', status: 'APPROVED', approver: '최유진' },
    { name: '김태호', type: 'ANNUAL', start: '2026-10-05', end: '2026-10-07', days: 3, reason: '가을 휴가', status: 'APPROVED', approver: '최유진' },
    { name: '이준호', type: 'SPECIAL', start: '2026-10-19', end: '2026-10-20', days: 2, reason: '경조사(결혼식)', status: 'APPROVED', approver: '김민준' },
    { name: '한소희', type: 'ANNUAL', start: '2026-11-09', end: '2026-11-09', days: 1, reason: '개인 사유', status: 'APPROVED', approver: '최유진' },
    { name: '박서연', type: 'HOURLY', start: '2026-11-16', end: '2026-11-16', startTime: '09:00', endTime: '11:00', days: 0.25, reason: '병원 방문', status: 'APPROVED', approver: '최유진' },
    { name: '김민준', type: 'ANNUAL', start: '2026-12-14', end: '2026-12-16', days: 3, reason: '연말 휴가', status: 'PENDING' },
    { name: '강지민', type: 'ANNUAL', start: '2026-12-21', end: '2026-12-22', days: 2, reason: '연말 휴가', status: 'REJECTED', approver: '김민준' },
  ];
  for (const lr of LEAVE_REQUESTS) {
    await prisma.leaveRequest.create({
      data: {
        userId: u(lr.name).id,
        type: lr.type,
        startDate: dateOnly(lr.start),
        endDate: dateOnly(lr.end),
        startTime: lr.startTime,
        endTime: lr.endTime,
        days: lr.days,
        reason: lr.reason,
        status: lr.status,
        approverId: lr.approver ? u(lr.approver).id : undefined,
      },
    });
  }
  console.log(`휴가 신청 ${LEAVE_REQUESTS.length}건 생성`);

  // 승인된 휴가는 leave.service.ts의 승인 로직과 동일하게 캘린더(Schedule)에 반영하고,
  // 연차를 소진하는 유형이면 LeaveBalance 스냅샷도 함께 갱신한다(내 프로필 차트가 이 테이블을 그대로 읽음).
  const approvedLeaveRangesByUser = new Map<string, { start: string; end: string }[]>();
  const additionalUsedByUser = new Map<string, number>();
  for (const lr of LEAVE_REQUESTS) {
    if (lr.status !== 'APPROVED') continue;
    const list = approvedLeaveRangesByUser.get(lr.name) ?? [];
    list.push({ start: lr.start, end: lr.end });
    approvedLeaveRangesByUser.set(lr.name, list);

    const { startAt, endAt, allDay } = scheduleWindowForLeave(lr.start, lr.end, lr.startTime, lr.endTime);
    await prisma.schedule.create({
      data: {
        companyId,
        ownerId: u(lr.name).id,
        title: `${lr.name} ${LEAVE_LABEL[lr.type]}`,
        description: lr.reason,
        type: 'VACATION',
        startAt,
        endAt,
        allDay,
        visibility: 'COMPANY',
      },
    });

    if (ANNUAL_CONSUMING_TYPES.has(lr.type)) {
      additionalUsedByUser.set(lr.name, (additionalUsedByUser.get(lr.name) ?? 0) + lr.days);
    }
  }
  for (const [name, extra] of additionalUsedByUser) {
    const userId = u(name).id;
    const balance = await prisma.leaveBalance.findUnique({ where: { userId_year: { userId, year: 2026 } } });
    if (!balance) continue;
    const usedDays = Number(balance.usedDays) + extra;
    await prisma.leaveBalance.update({
      where: { userId_year: { userId, year: 2026 } },
      data: { usedDays, remainingDays: Math.max(Number(balance.totalDays) - usedDays, 0) },
    });
  }
  console.log(`승인된 휴가 ${[...approvedLeaveRangesByUser.values()].reduce((s, r) => s + r.length, 0)}건 캘린더 반영 + 연차 잔액 갱신`);

  // ── 2. 근태 (8/1~12/31 평일 전체) ──
  const days = businessDaysInRange('2026-08-01', '2026-12-31');
  const attendanceRecords: {
    userId: string;
    workDate: Date;
    checkInAt: Date | null;
    checkOutAt: Date | null;
    status: 'NORMAL' | 'LATE' | 'ABSENT' | 'REMOTE' | 'BUSINESS_TRIP';
    workMinutes: number | null;
  }[] = [];
  for (const user of allUsers) {
    const ranges = approvedLeaveRangesByUser.get(user.name) ?? [];
    for (const day of days) {
      if (ranges.some((r) => inRange(day, r.start, r.end))) continue;
      const roll = Math.random();
      let status: 'NORMAL' | 'LATE' | 'ABSENT' | 'REMOTE' | 'BUSINESS_TRIP' = 'NORMAL';
      if (roll < 0.03) status = 'ABSENT';
      else if (roll < 0.05) status = 'BUSINESS_TRIP';
      else if (roll < 0.08) status = 'REMOTE';
      else if (roll < 0.15) status = 'LATE';

      if (status === 'ABSENT') {
        attendanceRecords.push({ userId: user.id, workDate: dateOnly(day), checkInAt: null, checkOutAt: null, status, workMinutes: null });
        continue;
      }
      const checkInTime = status === 'LATE' ? `09:${String(randomInt(5, 40)).padStart(2, '0')}` : `08:${String(randomInt(40, 59)).padStart(2, '0')}`;
      const checkOutTime = `${randomInt(17, 19)}:${String(randomInt(0, 59)).padStart(2, '0')}`;
      const checkInAt = kst(day, checkInTime);
      const checkOutAt = kst(day, checkOutTime);
      const workMinutes = Math.max(0, Math.round((checkOutAt.getTime() - checkInAt.getTime()) / 60000) - 60);
      attendanceRecords.push({ userId: user.id, workDate: dateOnly(day), checkInAt, checkOutAt, status, workMinutes });
    }
  }
  await prisma.attendance.createMany({ data: attendanceRecords, skipDuplicates: true });
  console.log(`근태 기록 ${attendanceRecords.length}건 생성`);

  // ── 3. 급여 (2026년 8~12월) — 8·9·10월 지급완료, 11월 확정, 12월 초안 ──
  const hr = u('최유진');
  const PAYROLL_MONTHS: { month: number; status: 'PAID' | 'CONFIRMED' | 'DRAFT'; confirmed: boolean; paid: boolean }[] = [
    { month: 8, status: 'PAID', confirmed: true, paid: true },
    { month: 9, status: 'PAID', confirmed: true, paid: true },
    { month: 10, status: 'PAID', confirmed: true, paid: true },
    { month: 11, status: 'CONFIRMED', confirmed: true, paid: false },
    { month: 12, status: 'DRAFT', confirmed: false, paid: false },
  ];
  const payrollRecords = [];
  for (const user of allUsers) {
    const base = Number(user.baseSalary ?? 2_600_000);
    for (const m of PAYROLL_MONTHS) {
      const mealAllowance = 100_000;
      const positionAllowance = base >= 3_000_000 ? 200_000 : 0;
      const allowances = { mealAllowance, positionAllowance };
      const nationalPension = Math.round(base * 0.045);
      const healthInsurance = Math.round(base * 0.0345);
      const incomeTax = Math.round(base * 0.03);
      const deductions = { nationalPension, healthInsurance, incomeTax };
      const netSalary = base + mealAllowance + positionAllowance - nationalPension - healthInsurance - incomeTax;
      payrollRecords.push({
        userId: user.id,
        payYear: 2026,
        payMonth: m.month,
        baseSalary: base,
        allowances,
        deductions,
        netSalary,
        status: m.status,
        confirmedAt: m.confirmed ? kst(`2026-${String(m.month).padStart(2, '0')}-25`, '10:00') : null,
        paidAt: m.paid ? kst(`2026-${String(m.month).padStart(2, '0')}-25`, '14:00') : null,
        createdBy: hr.id,
      });
    }
  }
  await prisma.payroll.createMany({ data: payrollRecords, skipDuplicates: true });
  console.log(`급여 명세 ${payrollRecords.length}건 생성`);

  // ── 4. 일정 (회의/출장 등, 휴가 일정은 위에서 이미 생성) ──
  type ScheduleSeed = {
    title: string;
    type: 'MEETING' | 'BUSINESS_TRIP' | 'ETC';
    start: string;
    end: string;
    allDay?: boolean;
    location?: string;
    owner: string;
    dept?: string;
    visibility: 'PRIVATE' | 'DEPARTMENT' | 'COMPANY';
    attendees: string[];
  };
  const SCHEDULES: ScheduleSeed[] = [
    { title: '월간 영업 실적 회의', type: 'MEETING', start: '2026-08-04T10:00', end: '2026-08-04T11:00', owner: '김민준', dept: '영업1팀', visibility: 'DEPARTMENT', attendees: ['김민준', '이준호', '강지민'] },
    { title: '여름 생산라인 정기점검', type: 'MEETING', start: '2026-08-12T14:00', end: '2026-08-12T15:30', owner: '윤태양', dept: '생산1팀', visibility: 'DEPARTMENT', attendees: ['윤태양', '한소희', '조민재'] },
    { title: '박서연 부산 출장', type: 'BUSINESS_TRIP', start: '2026-08-20T00:00', end: '2026-08-21T23:59', allDay: true, owner: '박서연', dept: '인사팀', visibility: 'DEPARTMENT', attendees: ['박서연'] },
    { title: '9월 신제품 런칭 회의', type: 'MEETING', start: '2026-09-07T15:00', end: '2026-09-07T16:00', owner: '김도윤', visibility: 'COMPANY', attendees: ['김도윤', '김민준', '윤태양'] },
    { title: '고객사 미팅 - 청우테크', type: 'MEETING', start: '2026-09-18T11:00', end: '2026-09-18T12:00', location: '청우테크 본사', owner: '이준호', dept: '영업1팀', visibility: 'DEPARTMENT', attendees: ['이준호'] },
    { title: '이준호 지방 출장', type: 'BUSINESS_TRIP', start: '2026-10-08T00:00', end: '2026-10-09T23:59', allDay: true, owner: '이준호', dept: '영업1팀', visibility: 'DEPARTMENT', attendees: ['이준호'] },
    { title: '4분기 인사평가 준비회의', type: 'MEETING', start: '2026-10-26T13:00', end: '2026-10-26T15:00', owner: '최유진', dept: '인사팀', visibility: 'COMPANY', attendees: ['최유진', '박서연', '김태호'] },
    { title: '생산 3라인 증설 검토', type: 'MEETING', start: '2026-11-09T10:00', end: '2026-11-09T11:30', owner: '김도윤', visibility: 'COMPANY', attendees: ['김도윤', '윤태양', '한소희'] },
    { title: '연말 재고 실사 계획 회의', type: 'MEETING', start: '2026-11-27T14:00', end: '2026-11-27T15:00', owner: '박지훈', dept: '생산1팀', visibility: 'DEPARTMENT', attendees: ['박지훈', '윤태양'] },
    { title: '2026년 송년회', type: 'ETC', start: '2026-12-18T18:00', end: '2026-12-18T21:00', owner: '김도윤', visibility: 'COMPANY', attendees: allUsers.map((x) => x.name) },
  ];
  for (const s of SCHEDULES) {
    const schedule = await prisma.schedule.create({
      data: {
        companyId,
        ownerId: u(s.owner).id,
        title: s.title,
        type: s.type,
        startAt: new Date(`${s.start}:00+09:00`),
        endAt: new Date(`${s.end}:00+09:00`),
        allDay: s.allDay ?? false,
        location: s.location,
        departmentId: s.dept ? deptIdByName.get(s.dept) : undefined,
        visibility: s.visibility,
      },
    });
    await prisma.scheduleAttendee.createMany({
      data: s.attendees.map((name) => ({ scheduleId: schedule.id, userId: u(name).id, status: 'ACCEPTED' as const })),
    });
  }
  console.log(`일정 ${SCHEDULES.length}건 생성`);

  // ── 5. 수주 (SO-2026-0011 ~) ──
  type SalesSeed = {
    orderNo: string;
    partner: string;
    date: string;
    status: 'QUOTE' | 'CONFIRMED' | 'SHIPPED' | 'INVOICED' | 'CANCELLED';
    creator: string;
    items: { sku: string; qty: number; unitPrice: number }[];
  };
  const SALES: SalesSeed[] = [
    { orderNo: 'SO-2026-0011', partner: '(주)한빛전자', date: '2026-08-04', status: 'INVOICED', creator: '김민준', items: [{ sku: 'PRD-1001', qty: 120, unitPrice: 12000 }, { sku: 'PRD-1003', qty: 60, unitPrice: 8000 }] },
    { orderNo: 'SO-2026-0012', partner: '청우테크', date: '2026-08-08', status: 'INVOICED', creator: '이준호', items: [{ sku: 'PRD-1002', qty: 90, unitPrice: 15000 }] },
    { orderNo: 'SO-2026-0013', partner: '삼진유통', date: '2026-08-13', status: 'SHIPPED', creator: '김민준', items: [{ sku: 'PRD-1007', qty: 600, unitPrice: 1200 }] },
    { orderNo: 'SO-2026-0014', partner: '미래산업', date: '2026-08-19', status: 'INVOICED', creator: '이준호', items: [{ sku: 'PRD-1004', qty: 25, unitPrice: 22000 }] },
    { orderNo: 'SO-2026-0015', partner: '우리자원', date: '2026-08-27', status: 'INVOICED', creator: '강지민', items: [{ sku: 'PRD-1005', qty: 70, unitPrice: 6000 }] },
    { orderNo: 'SO-2026-0016', partner: '청우테크', date: '2026-09-03', status: 'SHIPPED', creator: '이준호', items: [{ sku: 'PRD-1001', qty: 100, unitPrice: 12000 }] },
    { orderNo: 'SO-2026-0017', partner: '삼진유통', date: '2026-09-09', status: 'INVOICED', creator: '김민준', items: [{ sku: 'PRD-1008', qty: 400, unitPrice: 800 }] },
    { orderNo: 'SO-2026-0018', partner: '미래산업', date: '2026-09-16', status: 'CONFIRMED', creator: '이준호', items: [{ sku: 'PRD-1002', qty: 50, unitPrice: 15000 }] },
    { orderNo: 'SO-2026-0019', partner: '(주)한빛전자', date: '2026-09-24', status: 'INVOICED', creator: '김민준', items: [{ sku: 'PRD-1004', qty: 15, unitPrice: 22000 }] },
    { orderNo: 'SO-2026-0020', partner: '우리자원', date: '2026-10-02', status: 'CONFIRMED', creator: '강지민', items: [{ sku: 'PRD-1009', qty: 25, unitPrice: 5000 }] },
    { orderNo: 'SO-2026-0021', partner: '청우테크', date: '2026-10-14', status: 'SHIPPED', creator: '이준호', items: [{ sku: 'PRD-1003', qty: 120, unitPrice: 8000 }] },
    { orderNo: 'SO-2026-0022', partner: '삼진유통', date: '2026-10-23', status: 'INVOICED', creator: '김민준', items: [{ sku: 'PRD-1007', qty: 700, unitPrice: 1200 }, { sku: 'PRD-1010', qty: 40, unitPrice: 3000 }] },
    { orderNo: 'SO-2026-0023', partner: '(주)한빛전자', date: '2026-11-05', status: 'CONFIRMED', creator: '김민준', items: [{ sku: 'PRD-1001', qty: 90, unitPrice: 12000 }] },
    { orderNo: 'SO-2026-0024', partner: '미래산업', date: '2026-11-13', status: 'SHIPPED', creator: '이준호', items: [{ sku: 'PRD-1005', qty: 55, unitPrice: 6000 }] },
    { orderNo: 'SO-2026-0025', partner: '우리자원', date: '2026-11-21', status: 'QUOTE', creator: '강지민', items: [{ sku: 'PRD-1006', qty: 80, unitPrice: 4500 }] },
    { orderNo: 'SO-2026-0026', partner: '청우테크', date: '2026-12-03', status: 'CONFIRMED', creator: '이준호', items: [{ sku: 'PRD-1011', qty: 150, unitPrice: 2500 }] },
    { orderNo: 'SO-2026-0027', partner: '삼진유통', date: '2026-12-10', status: 'QUOTE', creator: '김민준', items: [{ sku: 'PRD-1002', qty: 35, unitPrice: 15000 }] },
    { orderNo: 'SO-2026-0028', partner: '(주)한빛전자', date: '2026-12-17', status: 'QUOTE', creator: '김민준', items: [{ sku: 'PRD-1012', qty: 200, unitPrice: 1800 }] },
  ];
  for (const so of SALES) {
    const totalAmount = so.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
    const partnerId = partnerByName.get(so.partner);
    if (!partnerId) throw new Error(`거래처를 찾을 수 없음: ${so.partner}`);
    await prisma.salesOrder.create({
      data: {
        companyId,
        orderNo: so.orderNo,
        partnerId,
        orderDate: dateOnly(so.date),
        status: so.status,
        totalAmount,
        createdBy: u(so.creator).id,
        items: {
          create: so.items.map((it) => ({
            productId: productBySku.get(it.sku)!.id,
            quantity: it.qty,
            unitPrice: it.unitPrice,
            amount: it.qty * it.unitPrice,
          })),
        },
      },
    });
  }
  console.log(`수주 ${SALES.length}건 생성`);

  // ── 6. 생산 오더 (PO-2026-0009 ~) ──
  type ProductionSeed = {
    orderNo: string;
    sku: string;
    plannedQty: number;
    producedQty: number;
    status: 'PLANNED' | 'IN_PROGRESS' | 'DELAYED' | 'COMPLETED' | 'CANCELLED';
    line: string;
    start: string;
    due: string;
    manager: string;
    warehouse?: string;
  };
  const PRODUCTIONS: ProductionSeed[] = [
    { orderNo: 'PO-2026-0009', sku: 'PRD-1001', plannedQty: 600, producedQty: 600, status: 'COMPLETED', line: '1라인', start: '2026-08-01', due: '2026-08-12', manager: '윤태양', warehouse: '본사 창고' },
    { orderNo: 'PO-2026-0010', sku: 'PRD-1007', plannedQty: 1800, producedQty: 1800, status: 'COMPLETED', line: '3라인', start: '2026-08-10', due: '2026-08-24', manager: '한소희', warehouse: '경기 물류창고' },
    { orderNo: 'PO-2026-0011', sku: 'PRD-1003', plannedQty: 900, producedQty: 900, status: 'COMPLETED', line: '2라인', start: '2026-09-02', due: '2026-09-14', manager: '조민재', warehouse: '본사 창고' },
    { orderNo: 'PO-2026-0012', sku: 'PRD-1005', plannedQty: 350, producedQty: 350, status: 'COMPLETED', line: '1라인', start: '2026-09-15', due: '2026-09-28', manager: '윤태양', warehouse: '본사 창고' },
    { orderNo: 'PO-2026-0013', sku: 'PRD-1002', plannedQty: 450, producedQty: 450, status: 'COMPLETED', line: '2라인', start: '2026-10-05', due: '2026-10-19', manager: '조민재', warehouse: '본사 창고' },
    { orderNo: 'PO-2026-0014', sku: 'PRD-1009', plannedQty: 120, producedQty: 80, status: 'IN_PROGRESS', line: '3라인', start: '2026-10-20', due: '2026-11-03', manager: '한소희' },
    { orderNo: 'PO-2026-0015', sku: 'PRD-1011', plannedQty: 1200, producedQty: 600, status: 'IN_PROGRESS', line: '2라인', start: '2026-11-10', due: '2026-11-24', manager: '조민재' },
    { orderNo: 'PO-2026-0016', sku: 'PRD-1006', plannedQty: 500, producedQty: 150, status: 'DELAYED', line: '1라인', start: '2026-11-01', due: '2026-11-14', manager: '윤태양' },
    { orderNo: 'PO-2026-0017', sku: 'PRD-1004', plannedQty: 200, producedQty: 0, status: 'PLANNED', line: '1라인', start: '2026-12-15', due: '2026-12-29', manager: '윤태양' },
    { orderNo: 'PO-2026-0018', sku: 'PRD-1008', plannedQty: 1500, producedQty: 0, status: 'PLANNED', line: '2라인', start: '2026-12-18', due: '2027-01-05', manager: '조민재' },
  ];
  const productionOrderByNo = new Map<string, string>();
  for (const po of PRODUCTIONS) {
    const created = await prisma.productionOrder.create({
      data: {
        companyId,
        orderNo: po.orderNo,
        productId: productBySku.get(po.sku)!.id,
        plannedQty: po.plannedQty,
        producedQty: po.producedQty,
        status: po.status,
        lineName: po.line,
        startDate: dateOnly(po.start),
        dueDate: dateOnly(po.due),
        managerId: u(po.manager).id,
        warehouseId: po.warehouse ? whByName.get(po.warehouse) : undefined,
      },
    });
    productionOrderByNo.set(po.orderNo, created.id);
  }
  console.log(`생산 오더 ${PRODUCTIONS.length}건 생성`);

  // ── 7. 입출고 이력 ──
  const movementRecords: {
    productId: string;
    warehouseId: string;
    type: 'IN' | 'OUT' | 'ADJUST';
    quantity: number;
    refType: 'PURCHASE' | 'SALES' | 'PRODUCTION' | 'ADJUSTMENT';
    refId: string | null;
    memo: string | null;
    createdBy: string;
    createdAt: Date;
  }[] = [];
  for (const po of PRODUCTIONS.filter((p) => p.status === 'COMPLETED')) {
    movementRecords.push({
      productId: productBySku.get(po.sku)!.id,
      warehouseId: whByName.get(po.warehouse!)!,
      type: 'IN',
      quantity: po.producedQty,
      refType: 'PRODUCTION',
      refId: productionOrderByNo.get(po.orderNo) ?? null,
      memo: `생산 완료 입고 (${po.orderNo})`,
      createdBy: u(po.manager).id,
      createdAt: kst(po.due, '17:00'),
    });
  }
  for (const so of SALES.filter((s) => ['SHIPPED', 'INVOICED'].includes(s.status))) {
    for (const it of so.items) {
      movementRecords.push({
        productId: productBySku.get(it.sku)!.id,
        warehouseId: mainWarehouseId,
        type: 'OUT',
        quantity: it.qty,
        refType: 'SALES',
        refId: null,
        memo: `수주 출고 (${so.orderNo})`,
        createdBy: u(so.creator).id,
        createdAt: kst(so.date, '16:00'),
      });
    }
  }
  const purchaseDays = businessDaysInRange('2026-08-01', '2026-12-31');
  const purchasers = ['윤태양', '한소희', '조민재'];
  const purchaseSkus = PRODUCTIONS.map((po) => po.sku).concat(['PRD-1005', 'PRD-1006', 'PRD-1010', 'PRD-1012']);
  for (let i = 0; i < 15; i++) {
    const info = productBySku.get(pick(purchaseSkus));
    if (!info) continue;
    movementRecords.push({
      productId: info.id,
      warehouseId: mainWarehouseId,
      type: 'IN',
      quantity: randomInt(50, 300),
      refType: 'PURCHASE',
      refId: null,
      memo: '원자재 입고',
      createdBy: u(pick(purchasers)).id,
      createdAt: kst(pick(purchaseDays), `${String(randomInt(9, 16)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}`),
    });
  }
  await prisma.stockMovement.createMany({ data: movementRecords, skipDuplicates: true });
  console.log(`입출고 이력 ${movementRecords.length}건 생성`);

  // ── 8. 공지사항 ──
  type AnnSeed = { title: string; content: string; category: string; pinned: boolean; author: string; publishedAt: string };
  const ANNOUNCEMENTS: AnnSeed[] = [
    { title: '8월 여름휴가 사용 독려', content: '아직 연차를 사용하지 않은 팀원은 8월 중 사용을 권장합니다.', category: '인사', pinned: false, author: '최유진', publishedAt: '2026-08-01' },
    { title: '3분기 매출 목표 안내', content: '3분기 매출 목표가 팀별로 공지되었습니다. 상세 내용은 영업 채널을 확인해주세요.', category: '영업', pinned: true, author: '김도윤', publishedAt: '2026-09-01' },
    { title: '생산설비 정기 점검 안내', content: '9월 둘째 주 전 라인 정기 점검이 예정되어 있습니다.', category: '생산', pinned: false, author: '윤태양', publishedAt: '2026-09-10' },
    { title: '4분기 인사평가 일정 공지', content: '2026년 4분기 인사평가가 10월 26일부터 진행됩니다.', category: '인사', pinned: true, author: '최유진', publishedAt: '2026-10-20' },
    { title: '재고관리 시스템 업데이트 안내', content: '재고관리 화면에 안전재고 알림 기능이 추가되었습니다.', category: '공지', pinned: false, author: '박지훈', publishedAt: '2026-11-05' },
    { title: '2026년 송년회 안내', content: '12월 18일(금) 저녁 전사 송년회가 진행됩니다. 일정 탭에서 확인해주세요.', category: '행사', pinned: true, author: '김도윤', publishedAt: '2026-12-01' },
  ];
  for (const a of ANNOUNCEMENTS) {
    const announcement = await prisma.announcement.create({
      data: {
        companyId,
        title: a.title,
        content: a.content,
        category: a.category,
        isPinned: a.pinned,
        authorId: u(a.author).id,
        publishedAt: kst(a.publishedAt, '09:00'),
      },
    });
    const readers = ['박지훈', '이수민', '강지민'].filter(() => Math.random() > 0.4);
    if (readers.length > 0) {
      await prisma.announcementRead.createMany({
        data: readers.map((name) => ({ announcementId: announcement.id, userId: u(name).id })),
        skipDuplicates: true,
      });
    }
  }
  console.log(`공지사항 ${ANNOUNCEMENTS.length}건 생성`);

  // ── 9. 알림 ──
  await prisma.notification.createMany({
    data: [
      { userId: u('이수민').id, type: 'LEAVE', title: '휴가 승인', message: '8월 5일~6일 연차가 승인되었습니다.', link: '/profile', isRead: true },
      { userId: u('최유진').id, type: 'LEAVE', title: '휴가 승인 요청', message: '김민준님이 연차를 신청했습니다.', link: '/employees', isRead: false },
      { userId: u('김태호').id, type: 'LEAVE', title: '휴가 승인', message: '10월 5일~7일 연차가 승인되었습니다.', link: '/profile', isRead: false },
      { userId: u('윤태양').id, type: 'PRODUCTION', title: '생산 오더 지연', message: 'PO-2026-0016 생산 오더가 지연 상태입니다.', link: '/production', isRead: false },
      { userId: u('김도윤').id, type: 'PAYROLL', title: '급여 확정 완료', message: '11월 급여 확정이 완료되었습니다.', link: '/payroll', isRead: false },
      { userId: u('박지훈').id, type: 'SCHEDULE', title: '일정 등록', message: '12월 18일 송년회 일정이 등록되었습니다.', link: '/schedule', isRead: true },
    ],
  });
  console.log('알림 6건 생성');

  console.log('8~12월 2차 데모 데이터 시드 완료');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
