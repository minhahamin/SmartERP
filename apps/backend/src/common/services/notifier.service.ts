import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface NotificationInput {
  type: string;
  title: string;
  message: string;
  link?: string;
  /** 같은 사용자에게 같은 키는 한 번만 만든다. 매일 도는 작업이 같은 알림을 반복해서 쌓지 않게 한다 */
  dedupeKey: string;
}

@Injectable()
export class NotifierService {
  constructor(private readonly prisma: PrismaService) {}

  /** 새로 만들어진 알림 개수를 돌려준다(이미 같은 키가 있으면 건너뛴다) */
  async notifyUsers(userIds: string[], input: NotificationInput): Promise<number> {
    if (userIds.length === 0) return 0;
    const { count } = await this.prisma.notification.createMany({
      data: [...new Set(userIds)].map((userId) => ({ userId, ...input })),
      skipDuplicates: true,
    });
    return count;
  }

  /** 회사 안에서 해당 역할을 가진 재직 중인 사용자에게 보낸다 */
  async notifyRoles(companyId: string, roleNames: string[], input: NotificationInput): Promise<number> {
    const users = await this.prisma.user.findMany({
      where: { companyId, status: 'ACTIVE', role: { name: { in: roleNames } } },
      select: { id: true },
    });
    return this.notifyUsers(
      users.map((u) => u.id),
      input,
    );
  }
}
