// docs/02-users-and-permissions.md 2.2 권한 매트릭스를 RBAC 테이블로 적재한다.
// "R(own)"/"C(own)" 같은 본인 한정 capability는 Permission 행을 만들지 않는다 —
// docs/08-api-design.md 8.4.2/8.4.3의 `/users/:id`, `/payrolls/me`처럼 별도의
// 본인 스코프 라우트(인증만 필요, @RequirePermissions 없음)로 구현되기 때문이다
// (docs/02 2.3: 본인/부서 스코프는 Permission 테이블이 아니라 서비스 레이어 Policy 함수가 처리).
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedDefaultRoles, type DefaultRoleName } from '../src/common/seed/default-roles';

const prisma = new PrismaClient();

/**
 * docs/02 2.1 페르소나 + 프론트엔드 mocks/employees.ts 데모 계정과 1:1로 맞춘 시드 사용자.
 * hireDate는 근로기준법 제60조 기반 연차 자동계산(leave-entitlement.util.ts)이 페르소나별로
 * 서로 다른 구간(1년 미만 월차/가산연차/25일 한도)을 보여주도록 일부러 분산시켰다.
 */
const DEMO_USERS: {
  role: DefaultRoleName;
  employeeNo: string;
  email: string;
  name: string;
  position: string;
  deptName: string;
  baseSalary: number;
  hireDate: Date;
}[] = [
  { role: 'ADMIN', employeeNo: 'E-1000', email: 'doyoon.kim@erpilot.io', name: '김도윤', position: '대표', deptName: '경영지원팀', baseSalary: 8_000_000, hireDate: new Date('2003-04-01') },
  { role: 'HR_MANAGER', employeeNo: 'E-1042', email: 'yujin.choi@erpilot.io', name: '최유진', position: '과장', deptName: '인사팀', baseSalary: 3_000_000, hireDate: new Date('2022-05-10') },
  { role: 'SALES_MANAGER', employeeNo: 'E-1024', email: 'minjun.kim@erpilot.io', name: '김민준', position: '팀장', deptName: '영업1팀', baseSalary: 3_200_000, hireDate: new Date('2021-04-15') },
  { role: 'EMPLOYEE', employeeNo: 'E-1031', email: 'jihoon.park@erpilot.io', name: '박지훈', position: '사원', deptName: '생산1팀', baseSalary: 2_800_000, hireDate: new Date('2025-11-01') },
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

  const roleIdByName = await seedDefaultRoles(prisma, company.id);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  for (const demo of DEMO_USERS) {
    await prisma.user.upsert({
      where: { companyId_email: { companyId: company.id, email: demo.email } },
      update: { hireDate: demo.hireDate },
      create: {
        companyId: company.id,
        employeeNo: demo.employeeNo,
        email: demo.email,
        passwordHash,
        name: demo.name,
        position: demo.position,
        hireDate: demo.hireDate,
        departmentId: departmentsByName.get(demo.deptName),
        roleId: roleIdByName[demo.role],
        baseSalary: demo.baseSalary,
      },
    });
  }

  for (const wh of [
    { name: '본사 창고', location: '서울 마포구' },
    { name: '경기 물류창고', location: '경기 고양시' },
  ]) {
    const existing = await prisma.warehouse.findFirst({ where: { companyId: company.id, name: wh.name } });
    if (!existing) await prisma.warehouse.create({ data: { ...wh, companyId: company.id } });
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
