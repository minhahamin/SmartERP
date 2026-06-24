import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateRoleDto, SetRolePermissionsDto, UpdateRoleDto } from './dto/role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ resource: 'asc' }, { action: 'asc' }] });
  }

  findAll(requester: AuthUser) {
    return this.prisma.role.findMany({
      where: { companyId: requester.companyId },
      include: { rolePermissions: { include: { permission: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, requester: AuthUser) {
    const role = await this.prisma.role.findFirst({
      where: { id, companyId: requester.companyId },
      include: { rolePermissions: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundException('역할을 찾을 수 없습니다.');
    return role;
  }

  create(dto: CreateRoleDto, requester: AuthUser) {
    return this.prisma.role.create({ data: { ...dto, companyId: requester.companyId, isSystem: false } });
  }

  async update(id: string, dto: UpdateRoleDto, requester: AuthUser) {
    const role = await this.findOne(id, requester);
    if (role.isSystem && dto.name) {
      throw new BadRequestException('시스템 기본 제공 역할의 이름은 변경할 수 없습니다.');
    }
    return this.prisma.role.update({ where: { id }, data: dto });
  }

  async remove(id: string, requester: AuthUser) {
    const role = await this.findOne(id, requester);
    if (role.isSystem) throw new BadRequestException('시스템 기본 제공 역할은 삭제할 수 없습니다.');

    const assignedUserCount = await this.prisma.user.count({ where: { roleId: id } });
    if (assignedUserCount > 0)
      throw new BadRequestException('해당 역할이 배정된 직원이 있어 삭제할 수 없습니다.');

    await this.prisma.role.delete({ where: { id } });
    return { success: true };
  }

  /** docs/02 2.3 — 토글 즉시 반영: 기존 매핑을 전부 교체한다(트랜잭션) */
  async setPermissions(id: string, dto: SetRolePermissionsDto, requester: AuthUser) {
    await this.findOne(id, requester);
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      this.prisma.rolePermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
      }),
    ]);
    return this.findOne(id, requester);
  }
}
