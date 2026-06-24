import { randomBytes } from 'crypto';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { PolicyService } from '../../common/services/policy.service';
import { paginate, type PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { SELF_EDITABLE_FIELDS, UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
  ) {}

  /** docs/02 2.2 — SALES_MANAGER는 R(dept)만 가능하므로 Permission 테이블이 구분 못 하는 부서 스코프를 여기서 강제 */
  private async scopeWhere(requester: AuthUser) {
    const where: Record<string, unknown> = { companyId: requester.companyId };
    if (requester.roleName === 'SALES_MANAGER') {
      where.departmentId = requester.departmentId;
    }
    return where;
  }

  async findAll(query: UserQueryDto, requester: AuthUser): Promise<PaginatedResult<unknown>> {
    const where = await this.scopeWhere(requester);
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { employeeNo: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { role: true, department: true },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  async findOne(id: string, requester: AuthUser) {
    await this.policy.assertAccess(requester, 'USER', 'READ', id);
    const user = await this.prisma.user.findFirst({
      where: { id, companyId: requester.companyId },
      include: { role: true, department: true },
    });
    if (!user) throw new NotFoundException('직원을 찾을 수 없습니다.');

    const isSelf = id === requester.sub;
    if (!isSelf && requester.roleName === 'SALES_MANAGER' && user.departmentId !== requester.departmentId) {
      throw new ForbiddenException('타 부서 직원 정보에 접근할 수 없습니다.');
    }
    return user;
  }

  async create(dto: CreateUserDto, requester: AuthUser) {
    await this.policy.assertAccess(requester, 'USER', 'CREATE');
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: requester.companyId } });
    const employeeNo = await this.nextEmployeeNo(requester.companyId);
    const temporaryPassword = randomBytes(6).toString('hex');
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const user = await this.prisma.user.create({
      data: { ...dto, companyId: company.id, employeeNo, passwordHash, hireDate: new Date(dto.hireDate) },
    });
    // 실제 운영에서는 초기 비밀번호 설정 링크를 이메일로 발송한다(docs/02 2.4) — 메일 발송은 범위 밖이라 임시 비밀번호를 그대로 반환
    return { ...user, temporaryPassword };
  }

  async update(id: string, dto: UpdateUserDto, requester: AuthUser) {
    const isSelf = id === requester.sub;
    const hasFullPermission = await this.policy.hasPermission(requester, 'USER', 'UPDATE');
    if (!isSelf && !hasFullPermission) {
      throw new ForbiddenException("'USER' 리소스에 대한 'UPDATE' 권한이 없습니다.");
    }

    const data = isSelf && !hasFullPermission ? this.pickSelfEditableFields(dto) : dto;
    const { hireDate, ...rest } = data;
    return this.prisma.user.update({
      where: { id },
      data: { ...rest, ...(hireDate ? { hireDate: new Date(hireDate) } : {}) },
    });
  }

  async remove(id: string, requester: AuthUser) {
    await this.policy.assertAccess(requester, 'USER', 'DELETE');
    // docs/07 7.6 #2 — 소프트 삭제: 과거 급여/근태 참조 무결성 유지를 위해 행을 삭제하지 않는다
    await this.prisma.user.update({ where: { id }, data: { status: 'RESIGNED' } });
    return { success: true };
  }

  private pickSelfEditableFields(dto: UpdateUserDto) {
    const picked: Partial<UpdateUserDto> = {};
    for (const field of SELF_EDITABLE_FIELDS) {
      if (dto[field] !== undefined) picked[field] = dto[field];
    }
    return picked;
  }

  private async nextEmployeeNo(companyId: string): Promise<string> {
    const count = await this.prisma.user.count({ where: { companyId } });
    return `E-${1000 + count}`;
  }
}
