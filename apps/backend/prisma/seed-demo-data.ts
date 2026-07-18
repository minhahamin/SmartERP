// prisma/seed.ts(회사/부서/역할/데모 로그인 4계정)가 이미 실행된 뒤에 돌리는 후속 시드.
// 전 모듈 메뉴(직원/근태/휴가/급여/일정/거래처/수주/제품/재고/입출고/생산/문서/공지)가
// 빈 화면으로 보이지 않도록 실제 서비스처럼 보이는 더미 데이터를 채운다.
// 섹션별로 "이미 데이터가 있으면 건너뛴다" 가드를 둬서 재실행해도 중복 생성되지 않는다.
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const COMPANY_BIZ_REG_NO = '123-45-67890';
const DEMO_PASSWORD = 'erpilot1234!';

/** 이 시드가 만드는 모든 날짜의 기준점(오늘) — 실제 서버 시각과 무관하게 고정해 데이터 일관성을 유지 */
const TODAY = '2026-07-18';

function kst(dateStr: string, time: string): Date {
  return new Date(`${dateStr}T${time}:00+09:00`);
}
function dateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}
/** anchor(YYYY-MM-DD, 미포함) 이전으로 count개의 평일 날짜를 오래된 순으로 반환 */
function businessDaysBefore(anchor: string, count: number): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${anchor}T00:00:00Z`);
  while (dates.length < count) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) dates.push(cursor.toISOString().slice(0, 10));
  }
  return dates.reverse();
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

async function main() {
  const company = await prisma.company.findUnique({ where: { bizRegNo: COMPANY_BIZ_REG_NO } });
  if (!company) throw new Error('prisma/seed.ts를 먼저 실행해 회사/기본 계정을 만들어주세요.');
  const companyId = company.id;

  const departments = await prisma.department.findMany({ where: { companyId } });
  const deptIdByName = new Map(departments.map((d) => [d.name, d.id]));

  const warehouses = await prisma.warehouse.findMany({ where: { companyId } });
  const whByName = new Map(warehouses.map((w) => [w.name, w.id]));
  const mainWarehouseId = whByName.get('본사 창고')!;
  const subWarehouseId = whByName.get('경기 물류창고')!;

  const roles = await prisma.role.findMany({ where: { companyId } });
  const roleIdByName = new Map(roles.map((r) => [r.name, r.id]));

  // ── 1. 추가 직원 (기존 4개 데모 로그인 계정 + 아래 9명 = 총 13명) ──
  const NEW_EMPLOYEES = [
    { employeeNo: 'E-1005', email: 'sumin.lee@erpilot.io', name: '이수민', position: '대리', deptName: '경영지원팀', baseSalary: 3_000_000, hireDate: '2020-03-02' },
    { employeeNo: 'E-1006', email: 'haeun.jeong@erpilot.io', name: '정하은', position: '주임', deptName: '경영지원팀', baseSalary: 2_700_000, hireDate: '2023-08-16' },
    { employeeNo: 'E-1043', email: 'seoyeon.park@erpilot.io', name: '박서연', position: '사원', deptName: '인사팀', baseSalary: 2_600_000, hireDate: '2024-02-19' },
    { employeeNo: 'E-1044', email: 'taeho.kim@erpilot.io', name: '김태호', position: '대리', deptName: '인사팀', baseSalary: 2_950_000, hireDate: '2021-09-01' },
    { employeeNo: 'E-1025', email: 'junho.lee@erpilot.io', name: '이준호', position: '대리', deptName: '영업1팀', baseSalary: 3_050_000, hireDate: '2019-11-11' },
    { employeeNo: 'E-1026', email: 'jimin.kang@erpilot.io', name: '강지민', position: '사원', deptName: '영업1팀', baseSalary: 2_650_000, hireDate: '2025-03-03' },
    { employeeNo: 'E-1032', email: 'taeyang.yoon@erpilot.io', name: '윤태양', position: '대리', deptName: '생산1팀', baseSalary: 2_980_000, hireDate: '2018-06-20' },
    { employeeNo: 'E-1033', email: 'sohee.han@erpilot.io', name: '한소희', position: '사원', deptName: '생산1팀', baseSalary: 2_650_000, hireDate: '2024-10-07' },
    { employeeNo: 'E-1034', email: 'minjae.cho@erpilot.io', name: '조민재', position: '사원', deptName: '생산1팀', baseSalary: 2_600_000, hireDate: '2025-09-15' },
  ];

  const existingEmployeeCount = await prisma.user.count({ where: { companyId, employeeNo: { in: NEW_EMPLOYEES.map((e) => e.employeeNo) } } });
  if (existingEmployeeCount === 0) {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    for (const emp of NEW_EMPLOYEES) {
      await prisma.user.create({
        data: {
          companyId,
          employeeNo: emp.employeeNo,
          email: emp.email,
          passwordHash,
          name: emp.name,
          position: emp.position,
          hireDate: dateOnly(emp.hireDate),
          departmentId: deptIdByName.get(emp.deptName),
          roleId: roleIdByName.get('EMPLOYEE')!,
          baseSalary: emp.baseSalary,
        },
      });
    }
    console.log(`직원 ${NEW_EMPLOYEES.length}명 추가 생성`);
  } else {
    console.log('직원 데이터 이미 존재 — 건너뜀');
  }

  const allUsers = await prisma.user.findMany({ where: { companyId } });
  const userByName = new Map(allUsers.map((u) => [u.name, u]));
  const u = (name: string) => {
    const found = userByName.get(name);
    if (!found) throw new Error(`유저를 찾을 수 없음: ${name}`);
    return found;
  };

  // ── 2. 연차 잔액(2026년) ──
  const LEAVE_BALANCES: Record<string, { total: number; used: number }> = {
    김도윤: { total: 25, used: 4 },
    최유진: { total: 16, used: 5 },
    김민준: { total: 17, used: 6 },
    박지훈: { total: 8, used: 2 },
    이수민: { total: 17, used: 7 },
    정하은: { total: 15, used: 3 },
    박서연: { total: 15, used: 2 },
    김태호: { total: 16, used: 4 },
    이준호: { total: 17, used: 8 },
    강지민: { total: 15, used: 3 },
    윤태양: { total: 18, used: 6 },
    한소희: { total: 15, used: 2 },
    조민재: { total: 9, used: 0 },
  };
  const leaveBalanceCount = await prisma.leaveBalance.count({ where: { userId: { in: allUsers.map((x) => x.id) }, year: 2026 } });
  if (leaveBalanceCount === 0) {
    await prisma.leaveBalance.createMany({
      data: Object.entries(LEAVE_BALANCES).map(([name, v]) => ({
        userId: u(name).id,
        year: 2026,
        totalDays: v.total,
        usedDays: v.used,
        remainingDays: v.total - v.used,
      })),
    });
    console.log('연차 잔액 생성');
  } else {
    console.log('연차 잔액 이미 존재 — 건너뜀');
  }

  // ── 3. 휴가 신청 ──
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
    { name: '박지훈', type: 'ANNUAL', start: '2026-06-15', end: '2026-06-16', days: 2, reason: '가족 행사', status: 'APPROVED', approver: '최유진' },
    { name: '박지훈', type: 'ANNUAL', start: '2026-08-03', end: '2026-08-03', days: 1, reason: '개인 사유', status: 'PENDING' },
    { name: '이수민', type: 'HALF_DAY_PM', start: '2026-07-10', end: '2026-07-10', startTime: '13:00', endTime: '18:00', days: 0.5, reason: '병원 방문', status: 'APPROVED', approver: '김도윤' },
    { name: '한소희', type: 'SICK', start: '2026-06-22', end: '2026-06-23', days: 2, reason: '몸살감기', status: 'APPROVED', approver: '최유진' },
    { name: '강지민', type: 'ANNUAL', start: '2026-07-01', end: '2026-07-03', days: 3, reason: '여름 휴가', status: 'APPROVED', approver: '김민준' },
    { name: '조민재', type: 'SICK', start: '2026-07-20', end: '2026-07-21', days: 2, reason: '병원 진료', status: 'PENDING' },
    { name: '윤태양', type: 'ANNUAL', start: '2026-06-29', end: '2026-06-29', days: 1, reason: '개인 사유', status: 'APPROVED', approver: '최유진' },
  ];
  const leaveRequestCount = await prisma.leaveRequest.count({ where: { userId: { in: allUsers.map((x) => x.id) } } });
  if (leaveRequestCount === 0) {
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
  } else {
    console.log('휴가 신청 이미 존재 — 건너뜀');
  }
  const approvedLeaveRangesByUser = new Map<string, { start: string; end: string }[]>();
  for (const lr of LEAVE_REQUESTS) {
    if (lr.status !== 'APPROVED') continue;
    const list = approvedLeaveRangesByUser.get(lr.name) ?? [];
    list.push({ start: lr.start, end: lr.end });
    approvedLeaveRangesByUser.set(lr.name, list);
  }

  // ── 4. 근태 (최근 평일 15일) ──
  const attendanceCount = await prisma.attendance.count({ where: { userId: { in: allUsers.map((x) => x.id) } } });
  if (attendanceCount === 0) {
    const days = businessDaysBefore(TODAY, 15);
    const records: {
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
        if (ranges.some((r) => inRange(day, r.start, r.end))) continue; // 승인된 휴가일은 근태 테이블 병합 로직이 처리
        const roll = Math.random();
        let status: 'NORMAL' | 'LATE' | 'ABSENT' | 'REMOTE' | 'BUSINESS_TRIP' = 'NORMAL';
        if (roll < 0.03) status = 'ABSENT';
        else if (roll < 0.05) status = 'BUSINESS_TRIP';
        else if (roll < 0.08) status = 'REMOTE';
        else if (roll < 0.15) status = 'LATE';

        if (status === 'ABSENT') {
          records.push({ userId: user.id, workDate: dateOnly(day), checkInAt: null, checkOutAt: null, status, workMinutes: null });
          continue;
        }
        const checkInTime = status === 'LATE' ? `09:${String(randomInt(5, 40)).padStart(2, '0')}` : `08:${String(randomInt(40, 59)).padStart(2, '0')}`;
        const checkOutTime = `${randomInt(17, 19)}:${String(randomInt(0, 59)).padStart(2, '0')}`;
        const checkInAt = kst(day, checkInTime);
        const checkOutAt = kst(day, checkOutTime);
        const workMinutes = Math.max(0, Math.round((checkOutAt.getTime() - checkInAt.getTime()) / 60000) - 60);
        records.push({ userId: user.id, workDate: dateOnly(day), checkInAt, checkOutAt, status, workMinutes });
      }
    }
    await prisma.attendance.createMany({ data: records, skipDuplicates: true });
    console.log(`근태 기록 ${records.length}건 생성`);
  } else {
    console.log('근태 기록 이미 존재 — 건너뜀');
  }

  // ── 5. 급여 (2026년 5,6,7월) ──
  const payrollCount = await prisma.payroll.count({ where: { userId: { in: allUsers.map((x) => x.id) } } });
  if (payrollCount === 0) {
    const hr = u('최유진');
    const months: { year: number; month: number; status: 'PAID' | 'PAID' | 'CONFIRMED'; confirmed: boolean; paid: boolean }[] = [
      { year: 2026, month: 5, status: 'PAID', confirmed: true, paid: true },
      { year: 2026, month: 6, status: 'PAID', confirmed: true, paid: true },
      { year: 2026, month: 7, status: 'CONFIRMED', confirmed: true, paid: false },
    ];
    const records = [];
    for (const user of allUsers) {
      const base = Number(user.baseSalary ?? 2_600_000);
      for (const m of months) {
        const mealAllowance = 100_000;
        const positionAllowance = base >= 3_000_000 ? 200_000 : 0;
        const allowances = { mealAllowance, positionAllowance };
        const nationalPension = Math.round(base * 0.045);
        const healthInsurance = Math.round(base * 0.0345);
        const incomeTax = Math.round(base * 0.03);
        const deductions = { nationalPension, healthInsurance, incomeTax };
        const netSalary = base + mealAllowance + positionAllowance - nationalPension - healthInsurance - incomeTax;
        records.push({
          userId: user.id,
          payYear: m.year,
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
    await prisma.payroll.createMany({ data: records, skipDuplicates: true });
    console.log(`급여 명세 ${records.length}건 생성`);
  } else {
    console.log('급여 명세 이미 존재 — 건너뜀');
  }

  // ── 6. 일정 ──
  const scheduleCount = await prisma.schedule.count({ where: { companyId } });
  if (scheduleCount === 0) {
    type ScheduleSeed = {
      title: string;
      type: 'MEETING' | 'VACATION' | 'BUSINESS_TRIP' | 'ETC';
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
      { title: '주간 영업 회의', type: 'MEETING', start: '2026-07-06T09:30', end: '2026-07-06T10:30', owner: '김민준', dept: '영업1팀', visibility: 'DEPARTMENT', attendees: ['김민준', '이준호', '강지민'] },
      { title: '생산 라인 점검', type: 'MEETING', start: '2026-07-08T14:00', end: '2026-07-08T15:00', owner: '윤태양', dept: '생산1팀', visibility: 'DEPARTMENT', attendees: ['윤태양', '한소희', '조민재'] },
      { title: '신제품 기획 회의', type: 'MEETING', start: '2026-07-11T15:00', end: '2026-07-11T16:00', owner: '김도윤', visibility: 'COMPANY', attendees: ['김도윤', '김민준', '윤태양'] },
      { title: '고객사 미팅 - 한빛전자', type: 'MEETING', start: '2026-07-15T11:00', end: '2026-07-15T12:00', location: '한빛전자 본사', owner: '김민준', dept: '영업1팀', visibility: 'DEPARTMENT', attendees: ['김민준'] },
      { title: '강지민 여름 휴가', type: 'VACATION', start: '2026-07-01T00:00', end: '2026-07-03T23:59', allDay: true, owner: '강지민', visibility: 'DEPARTMENT', attendees: ['강지민'] },
      { title: '박지훈 지방 출장', type: 'BUSINESS_TRIP', start: '2026-07-21T00:00', end: '2026-07-22T23:59', allDay: true, owner: '박지훈', visibility: 'DEPARTMENT', attendees: ['박지훈'] },
      { title: '2026년 하계 워크숍', type: 'ETC', start: '2026-07-24T10:00', end: '2026-07-24T17:00', owner: '김도윤', visibility: 'COMPANY', attendees: ['김도윤', '최유진', '김민준', '박지훈', '이수민', '윤태양'] },
      { title: '분기 인사 평가', type: 'MEETING', start: '2026-07-28T13:00', end: '2026-07-28T16:00', owner: '최유진', dept: '인사팀', visibility: 'COMPANY', attendees: ['최유진', '박서연', '김태호'] },
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
  } else {
    console.log('일정 이미 존재 — 건너뜀');
  }

  // ── 7. 거래처 ──
  const PARTNERS = [
    { name: '(주)한빛전자', bizRegNo: '111-22-33445', type: 'CUSTOMER', grade: 'A', ceoName: '한지원', phone: '02-2233-4455', email: 'contact@hanbit-elec.co.kr', address: '서울 금천구 가산디지털1로 10', manager: '김민준' },
    { name: '대성물산', bizRegNo: '222-33-44556', type: 'VENDOR', grade: 'B', ceoName: '오대성', phone: '031-556-7788', email: 'sales@daesung.co.kr', address: '경기 부천시 오정구 산업로 55', manager: '이준호' },
    { name: '청우테크', bizRegNo: '333-44-55667', type: 'CUSTOMER', grade: 'A', ceoName: '정청우', phone: '02-3344-5566', email: 'biz@chungwoo-tech.com', address: '서울 구로구 디지털로 300', manager: '김민준' },
    { name: '미래산업', bizRegNo: '444-55-66778', type: 'BOTH', grade: 'B', ceoName: '이미래', phone: '032-778-9900', email: 'info@miraeind.co.kr', address: '인천 남동구 남동공단로 120', manager: '이준호' },
    { name: '동해상사', bizRegNo: '555-66-77889', type: 'VENDOR', grade: 'C', ceoName: '강동해', phone: '051-990-1122', email: 'trade@donghae.co.kr', address: '부산 사상구 학감대로 45', manager: '이준호' },
    { name: '삼진유통', bizRegNo: '666-77-88990', type: 'CUSTOMER', grade: 'B', ceoName: '박삼진', phone: '02-1122-3344', email: 'order@samjin.co.kr', address: '서울 송파구 법원로 60', manager: '김민준' },
    { name: '그린패키징', bizRegNo: '777-88-99001', type: 'VENDOR', grade: 'B', ceoName: '최그린', phone: '031-334-5566', email: 'sales@greenpkg.co.kr', address: '경기 안산시 단원구 산단로 88', manager: '강지민' },
    { name: '우리자원', bizRegNo: '888-99-00112', type: 'CUSTOMER', grade: 'C', ceoName: '홍우리', phone: '02-5566-7788', email: 'contact@urizawon.co.kr', address: '서울 강서구 마곡중앙로 15', manager: '강지민' },
  ] as const;
  const partnerByName = new Map<string, string>();
  const existingPartners = await prisma.partner.findMany({ where: { companyId } });
  if (existingPartners.length === 0) {
    for (const p of PARTNERS) {
      const partner = await prisma.partner.create({
        data: {
          companyId,
          name: p.name,
          bizRegNo: p.bizRegNo,
          type: p.type,
          grade: p.grade,
          ceoName: p.ceoName,
          phone: p.phone,
          email: p.email,
          address: p.address,
          managerId: u(p.manager).id,
        },
      });
      partnerByName.set(p.name, partner.id);
    }
    console.log(`거래처 ${PARTNERS.length}건 생성`);
  } else {
    for (const p of existingPartners) partnerByName.set(p.name, p.id);
    console.log('거래처 이미 존재 — 건너뜀');
  }

  // ── 8. 제품 ──
  const PRODUCTS = [
    { sku: 'PRD-1001', name: '산업용 커넥터 A형', category: '전자부품', unit: 'EA', salePrice: 12000, costPrice: 7000, safetyStock: 200 },
    { sku: 'PRD-1002', name: '산업용 커넥터 B형', category: '전자부품', unit: 'EA', salePrice: 15000, costPrice: 9000, safetyStock: 150 },
    { sku: 'PRD-1003', name: 'PCB 기판 10x10', category: '전자부품', unit: 'EA', salePrice: 8000, costPrice: 5000, safetyStock: 300 },
    { sku: 'PRD-1004', name: '리튬이온 배터리 팩 2200mAh', category: '전자부품', unit: 'EA', salePrice: 22000, costPrice: 14000, safetyStock: 100 },
    { sku: 'PRD-1005', name: '알루미늄 방열판', category: '산업자재', unit: 'EA', salePrice: 6000, costPrice: 3500, safetyStock: 250 },
    { sku: 'PRD-1006', name: '스테인리스 브라켓', category: '산업자재', unit: 'EA', salePrice: 4500, costPrice: 2800, safetyStock: 400 },
    { sku: 'PRD-1007', name: '골판지 포장 박스(대)', category: '포장재', unit: 'EA', salePrice: 1200, costPrice: 700, safetyStock: 1000 },
    { sku: 'PRD-1008', name: '골판지 포장 박스(소)', category: '포장재', unit: 'EA', salePrice: 800, costPrice: 450, safetyStock: 1500 },
    { sku: 'PRD-1009', name: '완충 에어캡', category: '포장재', unit: 'ROLL', salePrice: 5000, costPrice: 3000, safetyStock: 80 },
    { sku: 'PRD-1010', name: '라벨 스티커 세트', category: '포장재', unit: 'SET', salePrice: 3000, costPrice: 1800, safetyStock: 300 },
    { sku: 'PRD-1011', name: '케이블 타이 100p', category: '소모품', unit: 'EA', salePrice: 2500, costPrice: 1500, safetyStock: 500 },
    { sku: 'PRD-1012', name: '절연 테이프', category: '소모품', unit: 'EA', salePrice: 1800, costPrice: 1000, safetyStock: 600 },
  ] as const;
  const productBySku = new Map<string, { id: string; safetyStock: number }>();
  const existingProducts = await prisma.product.findMany({ where: { companyId } });
  if (existingProducts.length === 0) {
    for (const p of PRODUCTS) {
      const product = await prisma.product.create({ data: { ...p, companyId, isActive: true } });
      productBySku.set(p.sku, { id: product.id, safetyStock: p.safetyStock });
    }
    console.log(`제품 ${PRODUCTS.length}건 생성`);
  } else {
    for (const p of existingProducts) productBySku.set(p.sku, { id: p.id, safetyStock: p.safetyStock });
    console.log('제품 이미 존재 — 건너뜀');
  }

  // ── 9. 재고 (제품 x 창고) ──
  const inventoryCount = await prisma.inventory.count({ where: { productId: { in: [...productBySku.values()].map((p) => p.id) } } });
  if (inventoryCount === 0) {
    const LOW_STOCK: Record<string, { main: number; sub: number }> = {
      'PRD-1004': { main: 40, sub: 60 }, // 안전재고(100) 미만 — 부족 배지 노출용
      'PRD-1009': { main: 90, sub: 30 }, // 안전재고(80) 미만(경기 물류창고)
    };
    const records = [];
    for (const p of PRODUCTS) {
      const info = productBySku.get(p.sku)!;
      const low = LOW_STOCK[p.sku];
      const mainQty = low ? low.main : Math.round(info.safetyStock * (1.2 + Math.random()));
      const subQty = low ? low.sub : Math.round(info.safetyStock * (0.5 + Math.random() * 0.8));
      records.push({ productId: info.id, warehouseId: mainWarehouseId, quantity: mainQty });
      records.push({ productId: info.id, warehouseId: subWarehouseId, quantity: subQty });
    }
    await prisma.inventory.createMany({ data: records, skipDuplicates: true });
    console.log(`재고 ${records.length}건 생성`);
  } else {
    console.log('재고 이미 존재 — 건너뜀');
  }

  // ── 10. 생산 오더 ──
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
    { orderNo: 'PO-2026-0001', sku: 'PRD-1001', plannedQty: 500, producedQty: 500, status: 'COMPLETED', line: '1라인', start: '2026-06-01', due: '2026-06-10', manager: '윤태양', warehouse: '본사 창고' },
    { orderNo: 'PO-2026-0002', sku: 'PRD-1003', plannedQty: 800, producedQty: 800, status: 'COMPLETED', line: '2라인', start: '2026-06-05', due: '2026-06-15', manager: '한소희', warehouse: '본사 창고' },
    { orderNo: 'PO-2026-0003', sku: 'PRD-1005', plannedQty: 300, producedQty: 180, status: 'IN_PROGRESS', line: '1라인', start: '2026-07-10', due: '2026-07-25', manager: '윤태양' },
    { orderNo: 'PO-2026-0004', sku: 'PRD-1002', plannedQty: 400, producedQty: 0, status: 'PLANNED', line: '2라인', start: '2026-07-22', due: '2026-08-05', manager: '조민재' },
    { orderNo: 'PO-2026-0005', sku: 'PRD-1007', plannedQty: 2000, producedQty: 1200, status: 'DELAYED', line: '3라인', start: '2026-06-20', due: '2026-07-05', manager: '한소희', warehouse: '경기 물류창고' },
    { orderNo: 'PO-2026-0006', sku: 'PRD-1004', plannedQty: 150, producedQty: 150, status: 'COMPLETED', line: '1라인', start: '2026-05-15', due: '2026-05-25', manager: '윤태양', warehouse: '본사 창고' },
    { orderNo: 'PO-2026-0007', sku: 'PRD-1009', plannedQty: 100, producedQty: 40, status: 'IN_PROGRESS', line: '3라인', start: '2026-07-14', due: '2026-07-28', manager: '조민재' },
    { orderNo: 'PO-2026-0008', sku: 'PRD-1011', plannedQty: 1000, producedQty: 0, status: 'PLANNED', line: '2라인', start: '2026-08-01', due: '2026-08-10', manager: '한소희' },
  ];
  const productionOrderByNo = new Map<string, string>();
  const existingProductions = await prisma.productionOrder.findMany({ where: { companyId } });
  if (existingProductions.length === 0) {
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
  } else {
    for (const po of existingProductions) productionOrderByNo.set(po.orderNo, po.id);
    console.log('생산 오더 이미 존재 — 건너뜀');
  }

  // ── 11. 수주 ──
  type SalesSeed = {
    orderNo: string;
    partner: string;
    date: string;
    status: 'QUOTE' | 'CONFIRMED' | 'SHIPPED' | 'INVOICED' | 'CANCELLED';
    creator: string;
    items: { sku: string; qty: number; unitPrice: number }[];
  };
  const SALES: SalesSeed[] = [
    { orderNo: 'SO-2026-0001', partner: '(주)한빛전자', date: '2026-06-02', status: 'INVOICED', creator: '김민준', items: [{ sku: 'PRD-1001', qty: 100, unitPrice: 12000 }, { sku: 'PRD-1003', qty: 50, unitPrice: 8000 }] },
    { orderNo: 'SO-2026-0002', partner: '청우테크', date: '2026-06-10', status: 'SHIPPED', creator: '이준호', items: [{ sku: 'PRD-1002', qty: 80, unitPrice: 15000 }] },
    { orderNo: 'SO-2026-0003', partner: '미래산업', date: '2026-06-18', status: 'CONFIRMED', creator: '김민준', items: [{ sku: 'PRD-1004', qty: 30, unitPrice: 22000 }] },
    { orderNo: 'SO-2026-0004', partner: '삼진유통', date: '2026-06-25', status: 'INVOICED', creator: '이준호', items: [{ sku: 'PRD-1007', qty: 500, unitPrice: 1200 }, { sku: 'PRD-1008', qty: 300, unitPrice: 800 }] },
    { orderNo: 'SO-2026-0005', partner: '우리자원', date: '2026-07-01', status: 'QUOTE', creator: '강지민', items: [{ sku: 'PRD-1005', qty: 60, unitPrice: 6000 }] },
    { orderNo: 'SO-2026-0006', partner: '(주)한빛전자', date: '2026-07-05', status: 'CONFIRMED', creator: '김민준', items: [{ sku: 'PRD-1002', qty: 40, unitPrice: 15000 }] },
    { orderNo: 'SO-2026-0007', partner: '청우테크', date: '2026-07-08', status: 'SHIPPED', creator: '이준호', items: [{ sku: 'PRD-1001', qty: 150, unitPrice: 12000 }] },
    { orderNo: 'SO-2026-0008', partner: '미래산업', date: '2026-07-12', status: 'CANCELLED', creator: '강지민', items: [{ sku: 'PRD-1006', qty: 100, unitPrice: 4500 }] },
    { orderNo: 'SO-2026-0009', partner: '삼진유통', date: '2026-07-15', status: 'QUOTE', creator: '김민준', items: [{ sku: 'PRD-1010', qty: 50, unitPrice: 3000 }, { sku: 'PRD-1011', qty: 200, unitPrice: 2500 }] },
    { orderNo: 'SO-2026-0010', partner: '우리자원', date: '2026-07-17', status: 'CONFIRMED', creator: '이준호', items: [{ sku: 'PRD-1009', qty: 20, unitPrice: 5000 }] },
  ];
  const existingSalesOrders = await prisma.salesOrder.findMany({ where: { companyId } });
  if (existingSalesOrders.length === 0) {
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
  } else {
    console.log('수주 이미 존재 — 건너뜀');
  }

  // ── 12. 입출고 이력 ──
  const stockMovementCount = await prisma.stockMovement.count({ where: { productId: { in: [...productBySku.values()].map((p) => p.id) } } });
  if (stockMovementCount === 0) {
    const records: {
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
      records.push({
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
        records.push({
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
    const purchaseDays = businessDaysBefore(TODAY, 20);
    const purchasers = ['윤태양', '한소희', '조민재'];
    for (let i = 0; i < 10; i++) {
      const p = pick(PRODUCTIONS.map((po) => po.sku).concat(['PRD-1005', 'PRD-1006', 'PRD-1010', 'PRD-1012']));
      const info = productBySku.get(p);
      if (!info) continue;
      records.push({
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
    await prisma.stockMovement.createMany({ data: records, skipDuplicates: true });
    console.log(`입출고 이력 ${records.length}건 생성`);
  } else {
    console.log('입출고 이력 이미 존재 — 건너뜀');
  }

  // ── 13. 문서함 ──
  const documentFolderCount = await prisma.documentFolder.count({ where: { companyId } });
  if (documentFolderCount === 0) {
    const FOLDERS = ['인사정책', '계약서', '보고서', '업무매뉴얼'];
    const folderIdByName = new Map<string, string>();
    for (const name of FOLDERS) {
      const folder = await prisma.documentFolder.create({ data: { companyId, name } });
      folderIdByName.set(name, folder.id);
    }
    type DocSeed = {
      title: string;
      category: 'POLICY' | 'CONTRACT' | 'REPORT' | 'MANUAL' | 'HR';
      folder: string;
      status: 'PUBLISHED' | 'DRAFT';
      isPublic: boolean;
      uploader: string;
      dept?: string;
    };
    const DOCS: DocSeed[] = [
      { title: '2026년 취업규칙', category: 'POLICY', folder: '인사정책', status: 'PUBLISHED', isPublic: true, uploader: '최유진' },
      { title: '연차 및 휴가 운영 지침', category: 'HR', folder: '인사정책', status: 'PUBLISHED', isPublic: true, uploader: '최유진' },
      { title: '한빛전자 납품 계약서', category: 'CONTRACT', folder: '계약서', status: 'PUBLISHED', isPublic: false, uploader: '김민준', dept: '영업1팀' },
      { title: '그린패키징 원자재 공급 계약서', category: 'CONTRACT', folder: '계약서', status: 'PUBLISHED', isPublic: false, uploader: '이준호', dept: '영업1팀' },
      { title: '2026년 2분기 매출 보고서', category: 'REPORT', folder: '보고서', status: 'PUBLISHED', isPublic: true, uploader: '김민준' },
      { title: '생산라인 품질 점검 보고서', category: 'REPORT', folder: '보고서', status: 'DRAFT', isPublic: true, uploader: '윤태양', dept: '생산1팀' },
      { title: '생산설비 운영 매뉴얼', category: 'MANUAL', folder: '업무매뉴얼', status: 'PUBLISHED', isPublic: true, uploader: '윤태양' },
      { title: '재고관리 시스템 사용 매뉴얼', category: 'MANUAL', folder: '업무매뉴얼', status: 'PUBLISHED', isPublic: true, uploader: '박지훈' },
    ];
    for (const [i, d] of DOCS.entries()) {
      await prisma.document.create({
        data: {
          companyId,
          folderId: folderIdByName.get(d.folder),
          title: d.title,
          category: d.category,
          // 실제 파일은 업로드 API로만 생성되므로, 시드는 목록/필터 UI 확인용 메타데이터만 채운다
          // (아래 경로에 실물 파일이 없어 미리보기/다운로드는 404가 난다).
          fileUrl: `/uploads/documents/seed-placeholder-${i + 1}.pdf`,
          fileType: 'application/pdf',
          fileSize: randomInt(120_000, 900_000),
          status: d.status,
          indexStatus: 'PENDING',
          isPublic: d.isPublic,
          departmentId: d.dept ? deptIdByName.get(d.dept) : undefined,
          uploadedBy: u(d.uploader).id,
        },
      });
    }
    console.log(`문서 ${DOCS.length}건 생성 (실물 파일 없음 — 목록/메타데이터 확인용)`);
  } else {
    console.log('문서 이미 존재 — 건너뜀');
  }

  // ── 14. 공지사항 ──
  const announcementCount = await prisma.announcement.count({ where: { companyId } });
  if (announcementCount === 0) {
    type AnnSeed = { title: string; content: string; category: string; pinned: boolean; author: string; targetRole?: string; publishedAt: string };
    const ANNOUNCEMENTS: AnnSeed[] = [
      { title: '2026년 하계 워크숍 안내', content: '7월 24일(금) 전사 워크숍이 진행됩니다. 참석 여부를 일정 탭에서 확인해주세요.', category: '행사', pinned: true, author: '김도윤', publishedAt: '2026-07-10' },
      { title: '7월 급여 지급일 안내', content: '7월 급여는 7월 25일에 지급됩니다.', category: '인사', pinned: true, author: '최유진', publishedAt: '2026-07-05' },
      { title: '신규 거래처 온보딩 절차 변경', content: '신규 거래처 등록 시 신용평가 등급 입력이 필수로 변경되었습니다.', category: '영업', pinned: false, author: '김민준', targetRole: 'SALES_MANAGER', publishedAt: '2026-07-08' },
      { title: '생산라인 정기 점검 일정 안내', content: '7월 넷째 주 1라인 정기 점검이 예정되어 있습니다.', category: '생산', pinned: false, author: '김도윤', publishedAt: '2026-07-12' },
      { title: '사내 보안 정책 업데이트', content: '사내 계정 비밀번호 정책이 강화되었습니다. 자세한 내용은 문서함을 확인해주세요.', category: '공지', pinned: false, author: '김도윤', publishedAt: '2026-06-28' },
      { title: '인사평가 일정 공지', content: '2026년 상반기 인사평가가 7월 28일 진행됩니다.', category: '인사', pinned: false, author: '최유진', publishedAt: '2026-07-15' },
    ];
    for (const a of ANNOUNCEMENTS) {
      const announcement = await prisma.announcement.create({
        data: {
          companyId,
          title: a.title,
          content: a.content,
          category: a.category,
          isPinned: a.pinned,
          targetRoleId: a.targetRole ? roleIdByName.get(a.targetRole) : undefined,
          authorId: u(a.author).id,
          publishedAt: kst(a.publishedAt, '09:00'),
        },
      });
      const readers = ['박지훈', '이수민'].filter(() => Math.random() > 0.4);
      if (readers.length > 0) {
        await prisma.announcementRead.createMany({
          data: readers.map((name) => ({ announcementId: announcement.id, userId: u(name).id })),
          skipDuplicates: true,
        });
      }
    }
    console.log(`공지사항 ${ANNOUNCEMENTS.length}건 생성`);
  } else {
    console.log('공지사항 이미 존재 — 건너뜀');
  }

  // ── 15. 알림 ── (NotificationType은 프론트/백엔드에서 INVENTORY|PRODUCTION|LEAVE|PAYROLL|SCHEDULE 5종만 지원)
  const notificationCount = await prisma.notification.count({ where: { userId: { in: allUsers.map((x) => x.id) } } });
  if (notificationCount === 0) {
    await prisma.notification.createMany({
      data: [
        { userId: u('박지훈').id, type: 'LEAVE', title: '휴가 승인', message: '6월 15일~16일 연차가 승인되었습니다.', link: '/profile', isRead: true },
        { userId: u('최유진').id, type: 'LEAVE', title: '휴가 승인 요청', message: '조민재님이 병가를 신청했습니다.', link: '/employees', isRead: false },
        { userId: u('김도윤').id, type: 'PAYROLL', title: '급여 정산 완료', message: '7월 급여 정산이 완료되었습니다.', link: '/payroll', isRead: false },
        { userId: u('윤태양').id, type: 'PRODUCTION', title: '생산 오더 지연', message: 'PO-2026-0005 생산 오더가 지연 상태입니다.', link: '/production', isRead: false },
        { userId: u('김도윤').id, type: 'INVENTORY', title: '재고 부족 경고', message: '리튬이온 배터리 팩 2200mAh 재고가 안전재고 미만입니다.', link: '/inventory', isRead: true },
      ],
    });
    console.log('알림 5건 생성');
  } else {
    console.log('알림 이미 존재 — 건너뜀');
  }

  console.log('데모 데이터 시드 완료');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
