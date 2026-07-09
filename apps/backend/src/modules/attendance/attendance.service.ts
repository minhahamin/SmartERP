import { BadRequestException, Injectable } from '@nestjs/common';
import type { Attendance, LeaveRequest } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PolicyService } from '../../common/services/policy.service';
import { paginate } from '../../common/interfaces/paginated-result.interface';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { LeaveService } from '../leave/leave.service';
import { LEAVE_TYPE_LABEL } from '../leave/leave-constants';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { CreateAttendanceDto, UpdateAttendanceDto } from './dto/create-attendance.dto';

/** 한국 표준시는 DST 없이 UTC+9로 고정이므로 서버 프로세스의 로컬 타임존 설정에 기대지 않고 직접 계산한다 */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** "오늘"을 KST 달력 기준으로 계산한다(서버가 UTC로 떠 있어도 자정 기준이 KST와 어긋나지 않도록) */
function todayDateOnly(): Date {
  const kstNow = new Date(Date.now() + KST_OFFSET_MS);
  return new Date(kstNow.toISOString().slice(0, 10));
}

/**
 * workDate(그날 KST 00:00 = UTC 자정)는 산술적으로 그날 KST 09:00과 정확히 같은 순간이다
 * (00:00 UTC + 9h = 09:00 KST). 그래서 출근 시각이 workDate 이후인지만 비교하면 로컬 타임존
 * 설정과 무관하게 "오전 9시 이후 출근 = 지각"을 정확히 판정할 수 있다.
 */
function resolveCheckInStatus(checkInAt: Date, workDate: Date): 'NORMAL' | 'LATE' {
  return checkInAt > workDate ? 'LATE' : 'NORMAL';
}

/** @db.Date 값은 항상 UTC 자정으로 내려오므로 UTC 기준으로만 날짜 키를 계산해 로컬 타임존과 무관하게 만든다 */
function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function eachDateKey(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (cursor <= last) {
    keys.push(dateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    private readonly leaveService: LeaveService,
  ) {}

  async findAll(query: AttendanceQueryDto, requester: AuthUser) {
    const where: Record<string, unknown> = { user: { companyId: requester.companyId } };
    if (requester.roleName === 'SALES_MANAGER') {
      where.user = { companyId: requester.companyId, departmentId: requester.departmentId };
    }
    if (query.departmentId) where.user = { ...(where.user as object), departmentId: query.departmentId };
    if (query.userId) where.userId = query.userId;
    if (query.from || query.to) {
      where.workDate = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        include: { user: true },
        orderBy: { workDate: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.attendance.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  /** 본인 근태 이력(docs 요구사항: 승인된 휴가/반차도 겹쳐 보여준다) — HR/Admin이 부서원 조회 시에도 재사용 */
  async findHistoryForUser(userId: string, query: AttendanceQueryDto, requester: AuthUser) {
    await this.policy.assertAccess(requester, 'ATTENDANCE', 'READ', userId);

    const [attendances, leaves] = await Promise.all([
      this.prisma.attendance.findMany({
        where: {
          userId,
          ...(query.from || query.to
            ? {
                workDate: {
                  ...(query.from ? { gte: new Date(query.from) } : {}),
                  ...(query.to ? { lte: new Date(query.to) } : {}),
                },
              }
            : {}),
        },
        orderBy: { workDate: 'desc' },
      }),
      this.leaveService.findApprovedInRange(userId, query.from, query.to),
    ]);

    return this.mergeAttendanceWithLeave(userId, attendances, leaves);
  }

  /** 승인된 휴가 기간의 각 날짜를 근태 기록과 병합한다 — 실제 출퇴근 기록이 있으면 그 위에 휴가 정보를
   * 덧붙이고(예: 오전 근무 + 오후반차), 출퇴근 기록이 없는 순수 휴가일은 ON_LEAVE 상태로 합성한다. */
  private mergeAttendanceWithLeave(userId: string, attendances: Attendance[], leaves: LeaveRequest[]) {
    const leaveByDate = new Map<string, LeaveRequest>();
    for (const leave of leaves) {
      for (const key of eachDateKey(leave.startDate, leave.endDate)) {
        leaveByDate.set(key, leave);
      }
    }

    const attendanceByDate = new Map(attendances.map((a) => [dateKey(a.workDate), a]));
    const allDateKeys = new Set([...attendanceByDate.keys(), ...leaveByDate.keys()]);

    return Array.from(allDateKeys)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((key) => {
        const attendance = attendanceByDate.get(key);
        const leave = leaveByDate.get(key);
        const base: Attendance = attendance ?? {
          id: `leave-${key}`,
          userId,
          workDate: new Date(`${key}T00:00:00.000Z`),
          checkInAt: null,
          checkOutAt: null,
          status: 'ON_LEAVE',
          workMinutes: null,
        };
        return {
          ...base,
          leave: leave
            ? {
                type: leave.type,
                label: LEAVE_TYPE_LABEL[leave.type],
                startTime: leave.startTime,
                endTime: leave.endTime,
              }
            : null,
        };
      });
  }

  /** docs/02 2.2 — EMPLOYEE/SALES_MANAGER도 "C(own 출퇴근)"으로 본인 체크인은 항상 허용 */
  async checkIn(requester: AuthUser) {
    const workDate = todayDateOnly();
    const existing = await this.prisma.attendance.findUnique({
      where: { userId_workDate: { userId: requester.sub, workDate } },
    });
    if (existing?.checkInAt) throw new BadRequestException('이미 출근 처리되었습니다.');

    const checkInAt = new Date();
    const status = resolveCheckInStatus(checkInAt, workDate);

    return this.prisma.attendance.upsert({
      where: { userId_workDate: { userId: requester.sub, workDate } },
      create: { userId: requester.sub, workDate, checkInAt, status },
      update: { checkInAt, status },
    });
  }

  async checkOut(requester: AuthUser) {
    const workDate = todayDateOnly();
    const existing = await this.prisma.attendance.findUnique({
      where: { userId_workDate: { userId: requester.sub, workDate } },
    });
    if (!existing?.checkInAt) throw new BadRequestException('출근 기록이 없습니다. 먼저 출근 처리해 주세요.');
    if (existing.checkOutAt) throw new BadRequestException('이미 퇴근 처리되었습니다.');

    const checkOutAt = new Date();
    const workMinutes = Math.round((checkOutAt.getTime() - existing.checkInAt.getTime()) / 60_000);
    return this.prisma.attendance.update({
      where: { id: existing.id },
      data: { checkOutAt, workMinutes },
    });
  }

  create(dto: CreateAttendanceDto) {
    return this.prisma.attendance.create({
      data: {
        userId: dto.userId,
        workDate: new Date(dto.workDate),
        checkInAt: dto.checkInAt ? new Date(dto.checkInAt) : undefined,
        checkOutAt: dto.checkOutAt ? new Date(dto.checkOutAt) : undefined,
        status: dto.status,
      },
    });
  }

  update(id: string, dto: UpdateAttendanceDto) {
    return this.prisma.attendance.update({
      where: { id },
      data: {
        ...(dto.checkInAt ? { checkInAt: new Date(dto.checkInAt) } : {}),
        ...(dto.checkOutAt ? { checkOutAt: new Date(dto.checkOutAt) } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });
  }
}
