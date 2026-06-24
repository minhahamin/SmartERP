import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(requester: AuthUser) {
    return this.prisma.department.findMany({
      where: { companyId: requester.companyId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, requester: AuthUser) {
    const department = await this.prisma.department.findFirst({ where: { id, companyId: requester.companyId } });
    if (!department) throw new NotFoundException('부서를 찾을 수 없습니다.');
    return department;
  }

  create(dto: CreateDepartmentDto, requester: AuthUser) {
    return this.prisma.department.create({ data: { ...dto, companyId: requester.companyId } });
  }

  async update(id: string, dto: UpdateDepartmentDto, requester: AuthUser) {
    await this.findOne(id, requester);
    if (dto.parentId === id) throw new BadRequestException('부서는 자기 자신을 상위 부서로 가질 수 없습니다.');
    return this.prisma.department.update({ where: { id }, data: dto });
  }

  async remove(id: string, requester: AuthUser) {
    await this.findOne(id, requester);
    const [childCount, userCount] = await Promise.all([
      this.prisma.department.count({ where: { parentId: id } }),
      this.prisma.user.count({ where: { departmentId: id, status: 'ACTIVE' } }),
    ]);
    if (childCount > 0) throw new BadRequestException('하위 부서가 있는 부서는 삭제할 수 없습니다.');
    if (userCount > 0) throw new BadRequestException('소속 직원이 있는 부서는 삭제할 수 없습니다.');

    await this.prisma.department.delete({ where: { id } });
    return { success: true };
  }
}
