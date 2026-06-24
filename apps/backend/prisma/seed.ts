// docs/02-users-and-permissions.md 2.2 권한 매트릭스를 RBAC 테이블로 적재한다.
// "R(own)"/"C(own)" 같은 본인 한정 capability는 Permission 행을 만들지 않는다 —
// docs/08-api-design.md 8.4.2/8.4.3의 `/users/:id`, `/payrolls/me`처럼 별도의
// 본인 스코프 라우트(인증만 필요, @RequirePermissions 없음)로 구현되기 때문이다
// (docs/02 2.3: 본인/부서 스코프는 Permission 테이블이 아니라 서비스 레이어 Policy 함수가 처리).
import { PrismaClient, PermissionAction } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

type RoleName = 'ADMIN' | 'HR_MANAGER' | 'SALES_MANAGER' | 'EMPLOYEE';

const A = PermissionAction;

/** resource별로 부여할 action 목록. CRUD = [CREATE,READ,UPDATE,DELETE] */
const ROLE_PERMISSIONS: Record<RoleName, Record<string, PermissionAction[]>> = {
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
    DOCUMENT: [A.CREATE, A.READ],
    ANNOUNCEMENT: [A.READ],
    STATISTICS: [A.READ],
  },
};

/** docs/02 2.1 페르소나 + 프론트엔드 mocks/employees.ts 데모 계정과 1:1로 맞춘 시드 사용자 */
const DEMO_USERS: { role: RoleName; employeeNo: string; email: string; name: string; position: string; deptName: string }[] = [
  { role: 'ADMIN', employeeNo: 'E-1000', email: 'doyoon.kim@erpilot.io', name: '김도윤', position: '대표', deptName: '경영지원팀' },
  { role: 'HR_MANAGER', employeeNo: 'E-1042', email: 'yujin.choi@erpilot.io', name: '최유진', position: '과장', deptName: '인사팀' },
  { role: 'SALES_MANAGER', employeeNo: 'E-1024', email: 'minjun.kim@erpilot.io', name: '김민준', position: '팀장', deptName: '영업1팀' },
  { role: 'EMPLOYEE', employeeNo: 'E-1031', email: 'jihoon.park@erpilot.io', name: '박지훈', position: '사원', deptName: '생산1팀' },
];

const DEMO_PASSWORD = 'erpilot1234!';

async function main() {
  const company = await prisma.company.upsert({
    where: { bizRegNo: '123-45-67890' },
    update: {},
    create: { name: 'ERPilot 데모', bizRegNo: '123-45-67890', plan: 'PRO' },
  });

  const departmentsByName = new Map<string, string>();
  for (const name of ['경영지원팀', '인사팀', '영업1팀', '생산1팀']) {
    const existing = await prisma.department.findFirst({ where: { companyId: company.id, name } });
    const dept = existing ?? (await prisma.department.create({ data: { companyId: company.id, name } }));
    departmentsByName.set(name, dept.id);
  }

  const permissionCache = new Map<string, string>();
  async function getPermissionId(resource: string, action: PermissionAction) {
    const key = `${resource}:${action}`;
    if (permissionCache.has(key)) return permissionCache.get(key)!;
    const permission = await prisma.permission.upsert({
      where: { resource_action: { resource, action } },
      update: {},
      create: { resource, action },
    });
    permissionCache.set(key, permission.id);
    return permission.id;
  }

  const roleIdByName = new Map<RoleName, string>();
  for (const roleName of Object.keys(ROLE_PERMISSIONS) as RoleName[]) {
    const role = await prisma.role.upsert({
      where: { companyId_name: { companyId: company.id, name: roleName } },
      update: {},
      create: { companyId: company.id, name: roleName, isSystem: true },
    });
    roleIdByName.set(roleName, role.id);

    const grants = ROLE_PERMISSIONS[roleName];
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

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  for (const demo of DEMO_USERS) {
    await prisma.user.upsert({
      where: { companyId_email: { companyId: company.id, email: demo.email } },
      update: {},
      create: {
        companyId: company.id,
        employeeNo: demo.employeeNo,
        email: demo.email,
        passwordHash,
        name: demo.name,
        position: demo.position,
        hireDate: new Date(),
        departmentId: departmentsByName.get(demo.deptName),
        roleId: roleIdByName.get(demo.role)!,
      },
    });
  }

  console.log(`시드 완료 — 회사: ${company.name}, 데모 계정 비밀번호: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
