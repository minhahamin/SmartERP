import { ForbiddenException, Injectable } from '@nestjs/common';
import type { PermissionAction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../interfaces/auth-user.interface';

/**
 * docs/02-users-and-permissions.md 2.3 — "R(own)" 같은 스코프 제약은 Permission 테이블이 아니라
 * 서비스 레이어의 Policy 함수로 처리한다. 동일 라우트가 "전체 권한 OR 본인"을 함께 허용해야 하는
 * 경우(예: docs/08 8.4.2 `/users/:id` "USER:READ 또는 본인")에 컨트롤러/서비스에서 직접 호출한다.
 */
@Injectable()
export class PolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async hasPermission(user: AuthUser, resource: string, action: PermissionAction): Promise<boolean> {
    const granted = await this.prisma.rolePermission.findFirst({
      where: { roleId: user.roleId, permission: { resource, action } },
    });
    return Boolean(granted);
  }

  /** ownerId가 본인이면 무조건 허용, 아니면 RolePermission 보유 여부로 판단 */
  async assertAccess(user: AuthUser, resource: string, action: PermissionAction, ownerId?: string): Promise<void> {
    if (ownerId && ownerId === user.sub) return;
    const granted = await this.hasPermission(user, resource, action);
    if (!granted) {
      throw new ForbiddenException(`'${resource}' 리소스에 대한 '${action}' 권한이 없습니다.`);
    }
  }

  /**
   * Schedule/ProductionOrder처럼 같은 RolePermission 행을 ADMIN/HR_MANAGER(전체)와
   * SALES_MANAGER/EMPLOYEE(본인 한정)가 함께 보유해 RBAC 테이블만으로는 "본인 것만" 제약을
   * 표현할 수 없는 리소스에 사용한다 — 지정한 역할이거나 본인 소유일 때만 허용한다.
   */
  assertOwnerOrRole(user: AuthUser, ownerId: string, allowedRoleNames: string[]): void {
    if (ownerId === user.sub) return;
    if (allowedRoleNames.includes(user.roleName)) return;
    throw new ForbiddenException('이 작업에 대한 권한이 없습니다.');
  }
}
