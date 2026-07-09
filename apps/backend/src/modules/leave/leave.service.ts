import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { paginate } from '../../common/interfaces/paginated-result.interface';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { LeaveQueryDto } from './dto/leave-query.dto';
import { calculateAnnualLeaveEntitlement } from './leave-entitlement.util';

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

  async create(dto: CreateLeaveRequestDto, requester: AuthUser) {
    const days = inclusiveDayCount(dto.startDate, dto.endDate);
    if (days <= 0) throw new BadRequestException('종료일은 시작일 이후여야 합니다.');

    if (dto.type === 'ANNUAL') {
      const balance = await this.findBalance(requester.sub, new Date(dto.startDate).getFullYear());
      if (days > balance.remainingDays) {
        throw new BadRequestException(
          `잔여 연차(${balance.remainingDays}일)보다 많은 일수(${days}일)를 신청할 수 없습니다.`,
        );
      }
    }

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
    if (request.userId !== requester.sub)
      throw new ForbiddenException('본인의 휴가 신청만 취소할 수 있습니다.');
    if (request.status !== 'PENDING') throw new BadRequestException('대기 중인 신청만 취소할 수 있습니다.');

    await this.prisma.leaveRequest.delete({ where: { id } });
    return { success: true };
  }

  approve(id: string, requester: AuthUser) {
    return this.transitionStatus(id, 'APPROVED', requester);
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
        type: 'ANNUAL',
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
}
