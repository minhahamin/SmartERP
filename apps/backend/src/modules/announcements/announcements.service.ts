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

    const targetRoleIds = announcements.map((a) => a.targetRoleId);
    const [targetRoleCounts, roleNames] = await Promise.all([
      this.countTargetRoles(targetRoleIds, requester.companyId),
      this.resolveRoleNames(targetRoleIds),
    ]);

    return announcements.map(({ _count, ...announcement }) => ({
      ...announcement,
      isReadByMe: readIds.has(announcement.id),
      readCount: _count.reads,
      totalTargetCount: targetRoleCounts.get(announcement.targetRoleId) ?? 0,
      targetRoleName: announcement.targetRoleId ? (roleNames.get(announcement.targetRoleId) ?? null) : null,
    }));
  }

  async findOne(id: string, requester: AuthUser) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, companyId: requester.companyId },
      include: { _count: { select: { reads: true } } },
    });
    if (!announcement) throw new NotFoundException('공지사항을 찾을 수 없습니다.');

    const { _count, ...rest } = announcement;
    const [targetRoleCounts, roleNames] = await Promise.all([
      this.countTargetRoles([announcement.targetRoleId], requester.companyId),
      this.resolveRoleNames([announcement.targetRoleId]),
    ]);
    return {
      ...rest,
      readCount: _count.reads,
      totalTargetCount: targetRoleCounts.get(announcement.targetRoleId) ?? 0,
      targetRoleName: announcement.targetRoleId ? (roleNames.get(announcement.targetRoleId) ?? null) : null,
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

  /**
   * targetRoleId(UUID) → 역할 이름(Role.name) 매핑을 서버에서 미리 만들어 응답에 실어 보낸다.
   * `GET /roles`는 PERMISSION:READ가 있는 관리자/인사담당자만 호출할 수 있는데, 공지사항은
   * 전 직원이 보는 화면이라 프론트가 그 API로 역할 이름을 직접 조회할 수 없다(EMPLOYEE는 403).
   */
  private async resolveRoleNames(targetRoleIds: (string | null)[]): Promise<Map<string, string>> {
    const roleIds = [...new Set(targetRoleIds.filter((id): id is string => id !== null))];
    if (roleIds.length === 0) return new Map();

    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, name: true },
    });
    return new Map(roles.map((r) => [r.id, r.name]));
  }
}
