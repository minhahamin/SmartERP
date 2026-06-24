import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PolicyService } from '../../common/services/policy.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/schedule.dto';
import { ScheduleQueryDto } from './dto/schedule-query.dto';

const FULL_ACCESS_ROLES = ['ADMIN', 'HR_MANAGER'];

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  /** docs/02 2.2 — ADMIN/HR_MANAGER는 전체, 그 외는 본인 일정 + 공개(부서/전사) 일정만 조회 */
  async findAll(query: ScheduleQueryDto, requester: AuthUser) {
    const range = query.from || query.to ? { startAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } } : {};

    const where: Record<string, unknown> = { companyId: requester.companyId, ...range };
    if (!FULL_ACCESS_ROLES.includes(requester.roleName)) {
      where.OR = [
        { ownerId: requester.sub },
        { visibility: 'COMPANY' },
        { visibility: 'DEPARTMENT', departmentId: requester.departmentId },
      ];
    }

    return this.prisma.schedule.findMany({ where, orderBy: { startAt: 'asc' } });
  }

  async findOne(id: string, requester: AuthUser) {
    const schedule = await this.prisma.schedule.findFirst({ where: { id, companyId: requester.companyId } });
    if (!schedule) throw new NotFoundException('일정을 찾을 수 없습니다.');
    return schedule;
  }

  create(dto: CreateScheduleDto, requester: AuthUser) {
    return this.prisma.schedule.create({
      data: {
        ...dto,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        companyId: requester.companyId,
        ownerId: requester.sub,
      },
    });
  }

  async update(id: string, dto: UpdateScheduleDto, requester: AuthUser) {
    const schedule = await this.findOne(id, requester);
    this.policy.assertOwnerOrRole(requester, schedule.ownerId, FULL_ACCESS_ROLES);

    return this.prisma.schedule.update({
      where: { id },
      data: { ...dto, ...(dto.startAt ? { startAt: new Date(dto.startAt) } : {}), ...(dto.endAt ? { endAt: new Date(dto.endAt) } : {}) },
    });
  }

  async remove(id: string, requester: AuthUser) {
    const schedule = await this.findOne(id, requester);
    this.policy.assertOwnerOrRole(requester, schedule.ownerId, FULL_ACCESS_ROLES);

    await this.prisma.schedule.delete({ where: { id } });
    return { success: true };
  }
}
