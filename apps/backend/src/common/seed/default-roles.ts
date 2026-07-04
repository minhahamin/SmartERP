import { PermissionAction, type PrismaClient } from '@prisma/client';

export type DefaultRoleName = 'ADMIN' | 'HR_MANAGER' | 'SALES_MANAGER' | 'EMPLOYEE';

const A = PermissionAction;

/** docs/02-users-and-permissions.md 2.2 권한 매트릭스 — resource별로 부여할 action 목록(CRUD = [CREATE,READ,UPDATE,DELETE]) */
export const DEFAULT_ROLE_PERMISSIONS: Record<DefaultRoleName, Record<string, PermissionAction[]>> = {
  ADMIN: {
    USER: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
    ATTENDANCE: [A.CREATE, A.READ, A.UPDATE, A.DELETE, A.APPROVE],
    LEAVE: [A.CREATE, A.READ, A.UPDATE, A.DELETE, A.APPROVE],
    PAYROLL: [A.CREATE, A.READ, A.UPDATE, A.DELETE, A.APPROVE],
    SCHEDULE: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
    DEPARTMENT: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
    PERMISSION: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
    PARTNER: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
    PRODUCT: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
    INVENTORY: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
    STOCK_MOVEMENT: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
    SALES_ORDER: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
    PRODUCTION: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
    DOCUMENT: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
    ANNOUNCEMENT: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
    STATISTICS: [A.READ],
  },
  HR_MANAGER: {
    USER: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
    ATTENDANCE: [A.CREATE, A.READ, A.UPDATE, A.DELETE, A.APPROVE],
    LEAVE: [A.READ, A.APPROVE],
    PAYROLL: [A.CREATE, A.READ, A.UPDATE, A.DELETE, A.APPROVE],
    SCHEDULE: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
    DEPARTMENT: [A.READ],
    DOCUMENT: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
    ANNOUNCEMENT: [A.CREATE, A.READ],
    STATISTICS: [A.READ],
  },
  SALES_MANAGER: {
    USER: [A.READ],
    ATTENDANCE: [A.READ],
    SCHEDULE: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
    DEPARTMENT: [A.READ],
    PARTNER: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
    PRODUCT: [A.READ, A.UPDATE],
    INVENTORY: [A.READ],
    STOCK_MOVEMENT: [A.CREATE],
    SALES_ORDER: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
    PRODUCTION: [A.READ],
    DOCUMENT: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
    ANNOUNCEMENT: [A.CREATE, A.READ],
    STATISTICS: [A.READ],
  },
  EMPLOYEE: {
    DEPARTMENT: [A.READ],
    SCHEDULE: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
    PRODUCTION: [A.CREATE, A.READ, A.UPDATE, A.DELETE],
    STOCK_MOVEMENT: [A.CREATE],
    PRODUCT: [A.READ],
    INVENTORY: [A.READ],
    PARTNER: [A.READ],
    SALES_ORDER: [A.READ],
    DOCUMENT: [A.CREATE, A.READ],
    ANNOUNCEMENT: [A.READ],
    STATISTICS: [A.READ],
  },
};

/**
 * 신규 회사(Tenant)에 4개 기본 역할 + 권한 매트릭스를 적재한다.
 * prisma/seed.ts(데모 데이터)와 AuthService.register(신규 회사 가입) 양쪽에서 공유한다.
 */
export async function seedDefaultRoles(
  prisma: PrismaClient,
  companyId: string,
): Promise<Record<DefaultRoleName, string>> {
  const permissionCache = new Map<string, string>();
  async function getPermissionId(resource: string, action: PermissionAction) {
    const key = `${resource}:${action}`;
    const cached = permissionCache.get(key);
    if (cached) return cached;
    const permission = await prisma.permission.upsert({
      where: { resource_action: { resource, action } },
      update: {},
      create: { resource, action },
    });
    permissionCache.set(key, permission.id);
    return permission.id;
  }

  const roleIdByName = {} as Record<DefaultRoleName, string>;
  for (const roleName of Object.keys(DEFAULT_ROLE_PERMISSIONS) as DefaultRoleName[]) {
    const role = await prisma.role.upsert({
      where: { companyId_name: { companyId, name: roleName } },
      update: {},
      create: { companyId, name: roleName, isSystem: true },
    });
    roleIdByName[roleName] = role.id;

    const grants = DEFAULT_ROLE_PERMISSIONS[roleName];
    for (const resource of Object.keys(grants)) {
      for (const action of grants[resource]) {
        const permissionId = await getPermissionId(resource, action);
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId } },
          update: {},
          create: { roleId: role.id, permissionId },
        });
      }
    }
  }
  return roleIdByName;
}
