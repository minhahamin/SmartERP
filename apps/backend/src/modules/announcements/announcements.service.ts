import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto/announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(requester: AuthUser) {
    const announcements = await this.prisma.announcement.findMany({
      where: { companyId: requester.companyId, OR: [{ targetRoleId: null }, { targetRoleId: requester.roleId }] },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
    });
    const readIds = new Set(
      (await this.prisma.announcementRead.findMany({ where: { userId: requester.sub }, select: { announcementId: true } })).map(
        (r) => r.announcementId,
      ),
    );
    return announcements.map((announcement) => ({ ...announcement, isReadByMe: readIds.has(announcement.id) }));
  }

  async findOne(id: string, requester: AuthUser) {
    const announcement = await this.prisma.announcement.findFirst({ where: { id, companyId: requester.companyId } });
    if (!announcement) throw new NotFoundException('공지사항을 찾을 수 없습니다.');
    return announcement;
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
}
