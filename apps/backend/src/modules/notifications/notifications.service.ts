import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

const LIST_LIMIT = 30;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(requester: AuthUser) {
    return this.prisma.notification.findMany({
      where: { userId: requester.sub },
      orderBy: { createdAt: 'desc' },
      take: LIST_LIMIT,
    });
  }

  async markRead(id: string, requester: AuthUser) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== requester.sub) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead(requester: AuthUser) {
    await this.prisma.notification.updateMany({
      where: { userId: requester.sub, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }
}
