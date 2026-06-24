import { Injectable, type CanActivate, type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PermissionAction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import type { AuthUser } from '../interfaces/auth-user.interface';

/**
 * docs/08-api-design.md 8.3 — 매 요청마다 DB에서 RolePermission을 조회하므로
 * 권한 관리 화면의 변경이 다음 요청부터 즉시 반영된다(JWT에 권한을 캐싱하지 않음, docs/12 12.4).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<{ resource: string; action: PermissionAction }>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true; // 권한 데코레이터 없는 엔드포인트는 인증만 요구

    const { user } = context.switchToHttp().getRequest<{ user: AuthUser }>();
    const hasPermission = await this.prisma.rolePermission.findFirst({
      where: {
        roleId: user.roleId,
        permission: { resource: required.resource, action: required.action },
      },
    });

    if (!hasPermission) {
      throw new ForbiddenException(`'${required.resource}' 리소스에 대한 '${required.action}' 권한이 없습니다.`);
    }
    return true;
  }
}
