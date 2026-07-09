import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { LeaveRequest, LeaveType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PolicyService } from '../../common/services/policy.service';
import { paginate } from '../../common/interfaces/paginated-result.interface';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { LeaveQueryDto } from './dto/leave-query.dto';
import { calculateAnnualLeaveEntitlement } from './leave-entitlement.util';
import {
  HALF_DAY_AM_WINDOW,
  HALF_DAY_PM_WINDOW,
  HOURLY_TIME_SLOTS,
  LEAVE_TYPE_LABEL,
} from './leave-constants';

/** 연차 잔여 한도를 소진하는 유형(반차/시간반차도 같은 연차 풀에서 차감된다) — 병가/경조사/무급휴가는 별도 */
const ANNUAL_CONSUMING_TYPES: LeaveType[] = ['ANNUAL', 'HALF_DAY_AM', 'HALF_DAY_PM', 'HOURLY'];

/** 오전반차/오후반차는 0.5일, 시간반차는 2시간(0.25일) 고정 단위로 차감한다 */
const FIXED_FRACTION_DAYS: Partial<Record<LeaveType, number>> = {
  HALF_DAY_AM: 0.5,
  HALF_DAY_PM: 0.5,
  HOURLY: 0.25,
};

function inclusiveDayCount(startDate: string, endDate: string): number {
  const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

function atTime(date: Date, hhmm: string): Date {
  const [hour, minute] = hhmm.split(':').map(Number);
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** 승인된 휴가를 일정관리 캘린더에 반영할 때 쓸 시작/종료 시각을 계산한다 — startTime/endTime이
 * 있으면(반차/시간반차) 그 구간을, 없으면(연차/병가/경조사/무급휴가) 종일 일정으로 처리한다. */
function resolveScheduleWindow(request: {
  startDate: Date;
  endDate: Date;
  startTime: string | null;
  endTime: string | null;
}): { startAt: Date; endAt: Date; allDay: boolean } {
  if (request.startTime && request.endTime) {
    return {
      startAt: atTime(request.startDate, request.startTime),
      endAt: atTime(request.startDate, request.endTime),
      allDay: false,
    };
  }
  const endExclusive = new Date(request.endDate);
  endExclusive.setDate(endExclusive.getDate() + 1);
  return { startAt: request.startDate, endAt: endExclusive, allDay: true };
}

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  async findAll(query: LeaveQueryDto, requester: AuthUser) {
    const where: Record<string, unknown> = { user: { companyId: requester.companyId } };
    if (query.status) where.status = query.status;
    if (query.departmentId) where.user = { ...(where.user as object), departmentId: query.departmentId };
    if (query.userId) where.userId = query.userId;

    const [items, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  findMine(userId: string) {
    return this.prisma.leaveRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  /** 근태 탭에 휴가 정보를 겹쳐 보여주기 위해(attendance.service.ts) 승인된 휴가만 기간으로 조회한다 */
  findApprovedInRange(userId: string, from?: string, to?: string) {
    return this.prisma.leaveRequest.findMany({
      where: {
        userId,
        status: 'APPROVED',
        ...(from ? { endDate: { gte: new Date(from) } } : {}),
        ...(to ? { startDate: { lte: new Date(to) } } : {}),
      },
    });
  }

  async create(dto: CreateLeaveRequestDto, requester: AuthUser) {
    const fixedDays = FIXED_FRACTION_DAYS[dto.type];
    let days: number;
    let startTime: string | undefined;
    let endTime: string | undefined;

    if (fixedDays !== undefined) {
      if (dto.startDate !== dto.endDate) {
        throw new BadRequestException(`${LEAVE_TYPE_LABEL[dto.type]}는 하루 단위로만 신청할 수 있습니다.`);
      }
      days = fixedDays;

      if (dto.type === 'HALF_DAY_AM') ({ startTime, endTime } = HALF_DAY_AM_WINDOW);
      else if (dto.type === 'HALF_DAY_PM') ({ startTime, endTime } = HALF_DAY_PM_WINDOW);
      else if (dto.type === 'HOURLY') {
        if (
          !dto.timeSlot ||
          !HOURLY_TIME_SLOTS.includes(dto.timeSlot as (typeof HOURLY_TIME_SLOTS)[number])
        ) {
          throw new BadRequestException('시간반차는 시간 구간을 선택해야 합니다.');
        }
        [startTime, endTime] = dto.timeSlot.split('-');
      }
    } else {
      days = inclusiveDayCount(dto.startDate, dto.endDate);
      if (days <= 0) throw new BadRequestException('종료일은 시작일 이후여야 합니다.');
    }

    if (ANNUAL_CONSUMING_TYPES.includes(dto.type)) {
      const balance = await this.findBalance(requester.sub, new Date(dto.startDate).getFullYear());
      if (days > balance.remainingDays) {
        throw new BadRequestException(
          `잔여 연차(${balance.remainingDays}일)보다 많은 일수(${days}일)를 신청할 수 없습니다.`,
        );
      }
    }

    // 본인이 이미 LEAVE:APPROVE 권한을 가진 관리자/인사담당자라면 스스로 결재를 기다릴 이유가 없어
    // 즉시 승인 처리한다(도구 노출과 동일하게 RolePermission 테이블을 조회해 하드코딩 없이 판단).
    const selfApproves = await this.policy.hasPermission(requester, 'LEAVE', 'APPROVE');

    const request = await this.prisma.leaveRequest.create({
      data: {
        userId: requester.sub,
        type: dto.type,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        startTime,
        endTime,
        days,
        reason: dto.reason,
        ...(selfApproves ? { status: 'APPROVED', approverId: requester.sub } : {}),
      },
    });

    if (selfApproves) {
      await this.createLeaveSchedule(request, requester);
    }

    return request;
  }

  async cancel(id: string, requester: AuthUser) {
    const request = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('휴가 신청을 찾을 수 없습니다.');
    if (request.userId !== requester.sub)
      throw new ForbiddenException('본인의 휴가 신청만 취소할 수 있습니다.');
    if (request.status !== 'PENDING') throw new BadRequestException('대기 중인 신청만 취소할 수 있습니다.');

    await this.prisma.leaveRequest.delete({ where: { id } });
    return { success: true };
  }

  /** 승인 시 근태연동으로 일정관리 캘린더에도 자동 반영한다(docs 요구사항: 승인된 휴가는 팀 캘린더에서 보여야 함) */
  async approve(id: string, requester: AuthUser) {
    const request = await this.transitionStatus(id, 'APPROVED', requester);
    await this.createLeaveSchedule(request, requester);
    return request;
  }

  reject(id: string, requester: AuthUser) {
    return this.transitionStatus(id, 'REJECTED', requester);
  }

  /**
   * 근로기준법 제60조 기준 연차를 실시간으로 계산한다(LeaveBalance 테이블에 별도로
   * 캐시된 값을 신뢰하지 않음 — 입사일 기준 발생일수와 승인된 연차 사용량을 그때그때 집계해
   * 값이 어긋날 여지를 없앤다).
   */
  async findBalance(userId: string, year: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { hireDate: true } });
    const now = new Date();
    const asOf = year === now.getFullYear() ? now : new Date(year, 11, 31);
    const totalDays = calculateAnnualLeaveEntitlement(user?.hireDate ?? null, asOf);

    const approvedAnnual = await this.prisma.leaveRequest.findMany({
      where: {
        userId,
        type: { in: ANNUAL_CONSUMING_TYPES },
        status: 'APPROVED',
        startDate: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31) },
      },
      select: { days: true },
    });
    const usedDays = approvedAnnual.reduce((sum, r) => sum + Number(r.days), 0);

    return { userId, year, totalDays, usedDays, remainingDays: Math.max(totalDays - usedDays, 0) };
  }

  private async transitionStatus(id: string, status: 'APPROVED' | 'REJECTED', requester: AuthUser) {
    const request = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('휴가 신청을 찾을 수 없습니다.');
    if (request.status !== 'PENDING') throw new BadRequestException('이미 처리된 신청입니다.');

    return this.prisma.leaveRequest.update({ where: { id }, data: { status, approverId: requester.sub } });
  }

  private async createLeaveSchedule(request: LeaveRequest, requester: AuthUser) {
    const employee = await this.prisma.user.findUnique({
      where: { id: request.userId },
      select: { name: true },
    });
    const { startAt, endAt, allDay } = resolveScheduleWindow(request);

    await this.prisma.schedule.create({
      data: {
        companyId: requester.companyId,
        ownerId: request.userId,
        title: `${employee?.name ?? '직원'} ${LEAVE_TYPE_LABEL[request.type]}`,
        description: request.reason ?? undefined,
        type: 'VACATION',
        startAt,
        endAt,
        allDay,
        // 팀 전체가 누가 휴가인지 볼 수 있어야 하므로 전사 공개로 등록한다
        visibility: 'COMPANY',
      },
    });
  }
}
