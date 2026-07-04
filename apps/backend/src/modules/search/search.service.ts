import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

export interface SearchResultItem {
  type: 'product' | 'partner' | 'employee' | 'document' | 'announcement' | 'production' | 'warehouse';
  id: string;
  title: string;
  subtitle: string | null;
  path: string;
}

const LIMIT_PER_TYPE = 5;

/**
 * 헤더 전체 검색. 리소스별 노출 여부는 AiToolsService와 동일하게 실제 RolePermission(READ)을
 * 조회해서 결정한다 — 권한 없는 리소스는 검색 결과 자체에서 제외한다.
 */
@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, requester: AuthUser): Promise<SearchResultItem[]> {
    const granted = await this.grantedReadResources(requester.roleId);
    const tasks: Promise<SearchResultItem[]>[] = [this.searchEmployees(q, requester)];

    if (granted.has('PRODUCT')) tasks.push(this.searchProducts(q, requester));
    if (granted.has('PARTNER')) tasks.push(this.searchPartners(q, requester));
    if (granted.has('DOCUMENT')) tasks.push(this.searchDocuments(q, requester));
    if (granted.has('ANNOUNCEMENT')) tasks.push(this.searchAnnouncements(q, requester));
    if (granted.has('PRODUCTION')) tasks.push(this.searchProductionOrders(q, requester));
    if (granted.has('INVENTORY')) tasks.push(this.searchWarehouses(q, requester));

    const results = await Promise.all(tasks);
    return results.flat();
  }

  private async grantedReadResources(roleId: string): Promise<Set<string>> {
    const rows = await this.prisma.rolePermission.findMany({
      where: { roleId, permission: { action: 'READ' } },
      select: { permission: { select: { resource: true } } },
    });
    return new Set(rows.map((r) => r.permission.resource));
  }

  private async searchProducts(q: string, requester: AuthUser): Promise<SearchResultItem[]> {
    const items = await this.prisma.product.findMany({
      where: {
        companyId: requester.companyId,
        OR: [{ name: { contains: q, mode: 'insensitive' } }, { sku: { contains: q, mode: 'insensitive' } }],
      },
      take: LIMIT_PER_TYPE,
    });
    return items.map((p) => ({
      type: 'product',
      id: p.id,
      title: p.name,
      subtitle: p.sku,
      path: `/products/${p.id}`,
    }));
  }

  private async searchPartners(q: string, requester: AuthUser): Promise<SearchResultItem[]> {
    const items = await this.prisma.partner.findMany({
      where: { companyId: requester.companyId, name: { contains: q, mode: 'insensitive' } },
      take: LIMIT_PER_TYPE,
    });
    return items.map((p) => ({
      type: 'partner',
      id: p.id,
      title: p.name,
      subtitle: p.type,
      path: '/partners',
    }));
  }

  /** 사내 연락처 검색은 급여 등 민감정보를 다루지 않으므로 AI 도구와 동일하게 전 역할에 열어둔다 */
  private async searchEmployees(q: string, requester: AuthUser): Promise<SearchResultItem[]> {
    const items = await this.prisma.user.findMany({
      where: { companyId: requester.companyId, status: 'ACTIVE', name: { contains: q, mode: 'insensitive' } },
      include: { department: true },
      take: LIMIT_PER_TYPE,
    });
    return items.map((e) => ({
      type: 'employee',
      id: e.id,
      title: e.name,
      subtitle: e.department?.name ?? null,
      path: `/employees/${e.id}`,
    }));
  }

  private async searchDocuments(q: string, requester: AuthUser): Promise<SearchResultItem[]> {
    const items = await this.prisma.document.findMany({
      where: {
        companyId: requester.companyId,
        title: { contains: q, mode: 'insensitive' },
        OR: [{ isPublic: true }, { departmentId: requester.departmentId }],
      },
      take: LIMIT_PER_TYPE,
    });
    return items.map((d) => ({
      type: 'document',
      id: d.id,
      title: d.title,
      subtitle: d.category,
      path: '/documents',
    }));
  }

  private async searchAnnouncements(q: string, requester: AuthUser): Promise<SearchResultItem[]> {
    const items = await this.prisma.announcement.findMany({
      where: {
        companyId: requester.companyId,
        title: { contains: q, mode: 'insensitive' },
        OR: [{ targetRoleId: null }, { targetRoleId: requester.roleId }],
      },
      take: LIMIT_PER_TYPE,
    });
    return items.map((a) => ({
      type: 'announcement',
      id: a.id,
      title: a.title,
      subtitle: null,
      path: '/announcements',
    }));
  }

  private async searchProductionOrders(q: string, requester: AuthUser): Promise<SearchResultItem[]> {
    const where: Record<string, unknown> = {
      companyId: requester.companyId,
      OR: [
        { orderNo: { contains: q, mode: 'insensitive' } },
        { product: { name: { contains: q, mode: 'insensitive' } } },
      ],
    };
    if (requester.roleName === 'EMPLOYEE') where.managerId = requester.sub;

    const items = await this.prisma.productionOrder.findMany({
      where,
      include: { product: true },
      take: LIMIT_PER_TYPE,
    });
    return items.map((o) => ({
      type: 'production',
      id: o.id,
      title: o.orderNo,
      subtitle: o.product.name,
      path: '/production',
    }));
  }

  private async searchWarehouses(q: string, requester: AuthUser): Promise<SearchResultItem[]> {
    const items = await this.prisma.warehouse.findMany({
      where: { companyId: requester.companyId, name: { contains: q, mode: 'insensitive' } },
      take: LIMIT_PER_TYPE,
    });
    return items.map((w) => ({
      type: 'warehouse',
      id: w.id,
      title: w.name,
      subtitle: w.location,
      path: '/inventory',
    }));
  }
}
