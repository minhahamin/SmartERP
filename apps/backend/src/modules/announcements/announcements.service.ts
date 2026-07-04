import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(requester: AuthUser) {
    const announcements = await this.prisma.announcement.findMany({
      where: {
        companyId: requester.companyId,
        OR: [{ targetRoleId: null }, { targetRoleId: requester.roleId }],
      },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      include: { _count: { select: { reads: true } } },
    });

    const readIds = new Set(
      (
        await this.prisma.announcementRead.findMany({
          where: { userId: requester.sub },
          select: { announcementId: true },
        })
      ).map((r) => r.announcementId),
    );

    const targetRoleCounts = await this.countTargetRoles(
      announcements.map((a) => a.targetRoleId),
      requester.companyId,
    );

    return announcements.map(({ _count, ...announcement }) => ({
      ...announcement,
      isReadByMe: readIds.has(announcement.id),
      readCount: _count.reads,
      totalTargetCount: targetRoleCounts.get(announcement.targetRoleId) ?? 0,
    }));
  }

  async findOne(id: string, requester: AuthUser) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, companyId: requester.companyId },
      include: { _count: { select: { reads: true } } },
    });
    if (!announcement) throw new NotFoundException('공지사항을 찾을 수 없습니다.');

    const { _count, ...rest } = announcement;
    const targetRoleCounts = await this.countTargetRoles([announcement.targetRoleId], requester.companyId);
    return {
      ...rest,
      readCount: _count.reads,
      totalTargetCount: targetRoleCounts.get(announcement.targetRoleId) ?? 0,
    };
  }

  create(dto: CreateAnnouncementDto, requester: AuthUser) {
    return this.prisma.announcement.create({
      data: { ...dto, companyId: requester.companyId, authorId: requester.sub, publishedAt: new Date() },
    });
  }

  async update(id: string, dto: UpdateAnnouncementDto, requester: AuthUser) {
    await this.findOne(id, requester);
    return this.prisma.announcement.update({ where: { id }, data: dto });
  }

  async remove(id: string, requester: AuthUser) {
    await this.findOne(id, requester);
    await this.prisma.announcement.delete({ where: { id } });
    return { success: true };
  }

  async markRead(id: string, requester: AuthUser) {
    await this.findOne(id, requester);
    await this.prisma.announcementRead.upsert({
      where: { announcementId_userId: { announcementId: id, userId: requester.sub } },
      create: { announcementId: id, userId: requester.sub },
      update: {},
    });
    return { success: true };
  }

  /** targetRoleId별 대상 인원 수(null=전사 인원 수)를 한 번에 계산해 N+1 쿼리를 피한다 */
  private async countTargetRoles(
    targetRoleIds: (string | null)[],
    companyId: string,
  ): Promise<Map<string | null, number>> {
    const roleIds = [...new Set(targetRoleIds.filter((id): id is string => id !== null))];
    const needsCompanyTotal = targetRoleIds.includes(null);

    const [companyTotal, roleCounts] = await Promise.all([
      needsCompanyTotal ? this.prisma.user.count({ where: { companyId } }) : Promise.resolve(0),
      roleIds.length > 0
        ? this.prisma.user.groupBy({
            by: ['roleId'],
            where: { companyId, roleId: { in: roleIds } },
            _count: true,
          })
        : Promise.resolve([]),
    ]);

    const map = new Map<string | null, number>();
    if (needsCompanyTotal) map.set(null, companyTotal);
    for (const row of roleCounts) map.set(row.roleId, row._count);
    return map;
  }
}
