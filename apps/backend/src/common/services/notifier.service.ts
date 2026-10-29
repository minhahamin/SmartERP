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

  /**
   * 특정 권한(예: LEAVE:APPROVE)을 가진 역할의 재직 사용자에게 보낸다. 역할 이름을 하드코딩하지 않으므로
   * 회사가 권한 매트릭스를 바꿔도 알림 대상이 따라간다. excludeUserId는 본인에게 보내지 않기 위한 값이다.
   */
  async notifyByPermission(
    companyId: string,
    permission: { resource: string; action: string },
    input: NotificationInput,
    excludeUserId?: string,
  ): Promise<number> {
    const users = await this.prisma.user.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
        role: {
          rolePermissions: {
            some: { permission: { resource: permission.resource, action: permission.action as never } },
          },
        },
      },
      select: { id: true },
    });
    return this.notifyUsers(
      users.map((u) => u.id),
      input,
    );
  }
}
