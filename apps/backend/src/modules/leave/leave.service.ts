import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/interfaces/paginated-result.interface';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { LeaveQueryDto } from './dto/leave-query.dto';

const DEFAULT_ANNUAL_LEAVE_DAYS = 15;

function inclusiveDayCount(startDate: string, endDate: string): number {
  const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

@Injectable()
export class LeaveService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: LeaveQueryDto, requester: AuthUser) {
    const where: Record<string, unknown> = { user: { companyId: requester.companyId } };
    if (query.status) where.status = query.status;
    if (query.departmentId) where.user = { ...(where.user as object), departmentId: query.departmentId };

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

  async create(dto: CreateLeaveRequestDto, requester: AuthUser) {
    const days = inclusiveDayCount(dto.startDate, dto.endDate);
    if (days <= 0) throw new BadRequestException('종료일은 시작일 이후여야 합니다.');

    return this.prisma.leaveRequest.create({
      data: {
        userId: requester.sub,
        type: dto.type,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        days,
        reason: dto.reason,
      },
    });
  }

  async cancel(id: string, requester: AuthUser) {
    const request = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('휴가 신청을 찾을 수 없습니다.');
    if (request.userId !== requester.sub) throw new ForbiddenException('본인의 휴가 신청만 취소할 수 있습니다.');
    if (request.status !== 'PENDING') throw new BadRequestException('대기 중인 신청만 취소할 수 있습니다.');

    await this.prisma.leaveRequest.delete({ where: { id } });
    return { success: true };
  }

  async approve(id: string, requester: AuthUser) {
    const request = await this.transitionStatus(id, 'APPROVED', requester);
    await this.applyToBalance(request.userId, request.startDate.getFullYear(), Number(request.days));
    return request;
  }

  reject(id: string, requester: AuthUser) {
    return this.transitionStatus(id, 'REJECTED', requester);
  }

  async findBalance(userId: string, year: number) {
    const balance = await this.prisma.leaveBalance.findUnique({ where: { userId_year: { userId, year } } });
    return balance ?? { userId, year, totalDays: DEFAULT_ANNUAL_LEAVE_DAYS, usedDays: 0, remainingDays: DEFAULT_ANNUAL_LEAVE_DAYS };
  }

  private async transitionStatus(id: string, status: 'APPROVED' | 'REJECTED', requester: AuthUser) {
    const request = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('휴가 신청을 찾을 수 없습니다.');
    if (request.status !== 'PENDING') throw new BadRequestException('이미 처리된 신청입니다.');

    return this.prisma.leaveRequest.update({ where: { id }, data: { status, approverId: requester.sub } });
  }

  private async applyToBalance(userId: string, year: number, days: number) {
    const existing = await this.prisma.leaveBalance.findUnique({ where: { userId_year: { userId, year } } });
    if (!existing) {
      await this.prisma.leaveBalance.create({
        data: { userId, year, totalDays: DEFAULT_ANNUAL_LEAVE_DAYS, usedDays: days, remainingDays: DEFAULT_ANNUAL_LEAVE_DAYS - days },
      });
      return;
    }
    await this.prisma.leaveBalance.update({
      where: { userId_year: { userId, year } },
      data: { usedDays: Number(existing.usedDays) + days, remainingDays: Number(existing.remainingDays) - days },
    });
  }
}
