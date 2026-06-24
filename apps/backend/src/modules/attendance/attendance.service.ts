import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PolicyService } from '../../common/services/policy.service';
import { paginate } from '../../common/interfaces/paginated-result.interface';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { CreateAttendanceDto, UpdateAttendanceDto } from './dto/create-attendance.dto';

function todayDateOnly(): Date {
  return new Date(new Date().toISOString().slice(0, 10));
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  async findAll(query: AttendanceQueryDto, requester: AuthUser) {
    const where: Record<string, unknown> = { user: { companyId: requester.companyId } };
    if (requester.roleName === 'SALES_MANAGER') {
      where.user = { companyId: requester.companyId, departmentId: requester.departmentId };
    }
    if (query.departmentId) where.user = { ...(where.user as object), departmentId: query.departmentId };
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

  async findHistoryForUser(userId: string, query: AttendanceQueryDto, requester: AuthUser) {
    await this.policy.assertAccess(requester, 'ATTENDANCE', 'READ', userId);
    return this.prisma.attendance.findMany({
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
    });
  }

  /** docs/02 2.2 — EMPLOYEE/SALES_MANAGER도 "C(own 출퇴근)"으로 본인 체크인은 항상 허용 */
  async checkIn(requester: AuthUser) {
    const workDate = todayDateOnly();
    const existing = await this.prisma.attendance.findUnique({
      where: { userId_workDate: { userId: requester.sub, workDate } },
    });
    if (existing?.checkInAt) throw new BadRequestException('이미 출근 처리되었습니다.');

    return this.prisma.attendance.upsert({
      where: { userId_workDate: { userId: requester.sub, workDate } },
      create: { userId: requester.sub, workDate, checkInAt: new Date(), status: 'NORMAL' },
      update: { checkInAt: new Date(), status: 'NORMAL' },
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
