import { Injectable } from '@nestjs/common';
import type { FunctionDeclaration } from '@google/genai';
import { PrismaService } from '../../prisma/prisma.service';
import { LeaveService } from '../leave/leave.service';
import type { AuthUser } from '../../common/interfaces/auth-user.interface';

interface ToolDefinition {
  declaration: FunctionDeclaration;
  /** null이면 별도 리소스 권한 없이 전 역할에 노출한다(근태/급여/연차처럼 본인 조회는 항상 허용되는 self-service 성격의 도구) */
  permission: { resource: string } | null;
  /** 질문에 이 중 하나라도 포함되면 노출 후보에 넣는다(1차 라우팅, docs/09 9.2 3단계와 동일한 목적) */
  keywords: string[];
}

/** Gemini가 채워 넣은 함수 인자(unknown)에서 안전하게 문자열만 추출한다 */
function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * docs/09-ai-chatbot-design.md 9.3의 이중 방어 구조를 실제 RolePermission 테이블로 구현한다.
 * 1) 노출 단계: 호출자의 RolePermission에 해당 리소스 READ 권한이 없으면 도구 자체를 목록에서 제외한다.
 * 2) 실행 단계: 각 tool 내부에서 EMPLOYEE는 조회 대상을 본인으로 강제하고, companyId로 항상 스코프를 건다.
 */
@Injectable()
export class AiToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaveService: LeaveService,
  ) {}

  private readonly tools: ToolDefinition[] = [
    {
      permission: { resource: 'INVENTORY' },
      keywords: ['재고', '창고', '안전재고', '부족'],
      declaration: {
        name: 'getLowStockProducts',
        description:
          '안전재고 기준 이하로 떨어진 제품 전체 목록을 창고별로 조회한다. 사용자가 특정 제품명을 언급하지 않고 "재고 부족한 품목", "안전재고 미달" 등 전체 현황을 물을 때 인자 없이 호출한다.',
        parametersJsonSchema: { type: 'object', properties: {}, required: [] },
      },
    },
    {
      permission: { resource: 'INVENTORY' },
      keywords: ['재고', '창고'],
      declaration: {
        name: 'getInventoryByProduct',
        description:
          '사용자가 실제로 이름을 언급한 특정 제품 하나의 창고별 현재 재고 수량을 조회한다. 제품명이 언급되지 않았다면 이 도구 대신 getLowStockProducts를 사용한다. productName을 임의로 만들어내지 않는다.',
        parametersJsonSchema: {
          type: 'object',
          properties: {
            productName: { type: 'string', description: '사용자가 언급한 제품명 그대로(부분 일치 가능)' },
          },
          required: ['productName'],
        },
      },
    },
    {
      permission: { resource: 'PRODUCT' },
      keywords: ['제품', '단가', '원가', '가격', 'SKU'],
      declaration: {
        name: 'getProductInfo',
        description: '제품의 기본 정보(단가, 원가, 안전재고, 활성 상태 등)를 조회한다.',
        parametersJsonSchema: {
          type: 'object',
          properties: { productName: { type: 'string' } },
          required: ['productName'],
        },
      },
    },
    {
      permission: { resource: 'STATISTICS' },
      keywords: ['매출', '판매', '주문', '실적'],
      declaration: {
        name: 'getSalesSummary',
        description: '특정 연/월의 매출 합계와 주문 목록을 조회한다. 연/월 미지정 시 이번 달 기준.',
        parametersJsonSchema: {
          type: 'object',
          properties: { year: { type: 'integer' }, month: { type: 'integer', description: '1~12' } },
          required: [],
        },
      },
    },
    {
      permission: { resource: 'PARTNER' },
      keywords: ['거래처', '고객사', '공급사', '바이어'],
      declaration: {
        name: 'getPartnerInfo',
        description: '거래처 정보를 이름으로 검색한다. 이름 미지정 시 상위 거래처 목록을 반환한다.',
        parametersJsonSchema: {
          type: 'object',
          properties: { partnerName: { type: 'string' } },
          required: [],
        },
      },
    },
    {
      permission: { resource: 'PRODUCTION' },
      keywords: ['생산', '오더', '라인', '지연'],
      declaration: {
        name: 'getProductionOrdersByStatus',
        description: '생산 오더를 상태별로 조회한다. 상태 미지정 시 진행중+지연 오더를 반환한다.',
        parametersJsonSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['PLANNED', 'IN_PROGRESS', 'DELAYED', 'COMPLETED', 'CANCELLED'] },
          },
          required: [],
        },
      },
    },
    {
      permission: null,
      keywords: ['근태', '출근', '퇴근', '지각', '결근', '출퇴근'],
      declaration: {
        name: 'getAttendanceSummary',
        description: '직원의 최근 근태(출퇴근) 현황을 조회한다. 이름 미지정 시 요청자 본인 기준.',
        parametersJsonSchema: {
          type: 'object',
          properties: { employeeName: { type: 'string' } },
          required: [],
        },
      },
    },
    {
      permission: null,
      keywords: ['급여', '연봉', '월급', '임금'],
      declaration: {
        name: 'getPayrollStatus',
        description: '직원의 급여 상태와 최근 지급 내역을 조회한다. 이름 미지정 시 요청자 본인 기준.',
        parametersJsonSchema: {
          type: 'object',
          properties: {
            employeeName: { type: 'string' },
            year: { type: 'integer' },
            month: { type: 'integer' },
          },
          required: [],
        },
      },
    },
    {
      permission: null,
      keywords: ['연차', '휴가'],
      declaration: {
        name: 'getLeaveBalance',
        description: '직원의 올해 연차 잔여일수를 조회한다. 이름 미지정 시 요청자 본인 기준.',
        parametersJsonSchema: {
          type: 'object',
          properties: { employeeName: { type: 'string' } },
          required: [],
        },
      },
    },
    {
      permission: null,
      keywords: ['연락처', '전화번호', '직원', '부서', '직급'],
      declaration: {
        name: 'getEmployeeDirectory',
        description:
          '사내 직원 연락처(이름/부서/직급/전화번호)를 검색한다. 급여 등 민감정보는 포함하지 않는다.',
        parametersJsonSchema: {
          type: 'object',
          properties: { employeeName: { type: 'string' } },
          required: [],
        },
      },
    },
    {
      permission: { resource: 'ANNOUNCEMENT' },
      keywords: ['공지'],
      declaration: {
        name: 'getAnnouncements',
        description: '요청자가 볼 수 있는 최신 공지사항을 조회한다.',
        parametersJsonSchema: { type: 'object', properties: {}, required: [] },
      },
    },
    {
      permission: { resource: 'DOCUMENT' },
      keywords: ['규정', '정책', '취업규칙', '매뉴얼', '가이드', '문서', '계약', '보고서', '사용법', '절차'],
      declaration: {
        name: 'searchInternalDocuments',
        description:
          '사내 문서(정책/계약/보고서/매뉴얼/인사 등)를 제목·요약 키워드로 검색한다. 규정/절차/가이드성 질문에 사용한다.',
        parametersJsonSchema: {
          type: 'object',
          properties: { query: { type: 'string', description: '검색어(예: 연차, 취업규칙, 보안정책)' } },
          required: ['query'],
        },
      },
    },
  ];

  /**
   * docs/09-ai-chatbot-design.md 9.2의 "1차 라우팅" 목적을 별도 LLM 호출 없이 키워드 매칭으로 구현한다.
   * gemini-2.5-flash-lite처럼 가벼운 모델은 도구가 10개 이상 한 번에 주어지면 엉뚱한 도구를 고르거나
   * 인자를 지어내는 경향이 있어, 질문과 관련된 도구만 우선 좁혀서 노출하고(신뢰도↑), 키워드가 전혀
   * 매칭되지 않는 새로운 질문에는 권한 내 전체 도구를 노출해 "내가 언급하지 않은 것도 물어보면 답한다"는
   * 요구를 만족시킨다.
   */
  async getDeclarations(requester: AuthUser, userMessage: string): Promise<FunctionDeclaration[]> {
    const granted = await this.grantedReadResources(requester.roleId);
    const allowed = this.tools.filter((t) => t.permission === null || granted.has(t.permission.resource));

    const matched = allowed.filter((t) => t.keywords.some((k) => userMessage.includes(k)));
    return (matched.length > 0 ? matched : allowed).map((t) => t.declaration);
  }

  async execute(name: string, args: Record<string, unknown>, requester: AuthUser): Promise<unknown> {
    const tool = this.tools.find((t) => t.declaration.name === name);
    if (!tool) return { error: `알 수 없는 도구입니다: ${name}` };

    if (tool.permission) {
      const granted = await this.grantedReadResources(requester.roleId);
      if (!granted.has(tool.permission.resource)) {
        return { error: `'${tool.permission.resource}' 데이터에 접근할 권한이 없습니다.` };
      }
    }

    switch (name) {
      case 'getLowStockProducts':
        return this.getLowStockProducts(requester);
      case 'getInventoryByProduct':
        return this.getInventoryByProduct(requester, asString(args.productName));
      case 'getProductInfo':
        return this.getProductInfo(requester, asString(args.productName));
      case 'getSalesSummary':
        return this.getSalesSummary(
          requester,
          args.year as number | undefined,
          args.month as number | undefined,
        );
      case 'getPartnerInfo':
        return this.getPartnerInfo(requester, args.partnerName as string | undefined);
      case 'getProductionOrdersByStatus':
        return this.getProductionOrdersByStatus(requester, args.status as string | undefined);
      case 'getAttendanceSummary':
        return this.getAttendanceSummary(requester, args.employeeName as string | undefined);
      case 'getPayrollStatus':
        return this.getPayrollStatus(
          requester,
          args.employeeName as string | undefined,
          args.year as number | undefined,
          args.month as number | undefined,
        );
      case 'getLeaveBalance':
        return this.getLeaveBalance(requester, args.employeeName as string | undefined);
      case 'getEmployeeDirectory':
        return this.getEmployeeDirectory(requester, args.employeeName as string | undefined);
      case 'getAnnouncements':
        return this.getAnnouncements(requester);
      case 'searchInternalDocuments':
        return this.searchInternalDocuments(requester, asString(args.query));
      default:
        return { error: `구현되지 않은 도구입니다: ${name}` };
    }
  }

  private async grantedReadResources(roleId: string): Promise<Set<string>> {
    const rows = await this.prisma.rolePermission.findMany({
      where: { roleId, permission: { action: 'READ' } },
      select: { permission: { select: { resource: true } } },
    });
    return new Set(rows.map((r) => r.permission.resource));
  }

  private async getLowStockProducts(requester: AuthUser) {
    const rows = await this.prisma.$queryRaw<
      { productName: string; unit: string; quantity: number; safetyStock: number; warehouseName: string }[]
    >`
      SELECT p.name as "productName", p.unit, i.quantity, p."safetyStock", w.name as "warehouseName"
      FROM inventories i
      JOIN products p ON p.id = i."productId"
      JOIN warehouses w ON w.id = i."warehouseId"
      WHERE p."companyId" = ${requester.companyId} AND i.quantity <= p."safetyStock"
      ORDER BY i.quantity ASC
    `;
    return rows.length === 0
      ? { found: false, message: '안전재고 기준 미달 품목이 없습니다.' }
      : { found: true, count: rows.length, items: rows };
  }

  private async getInventoryByProduct(requester: AuthUser, productName: string) {
    const product = await this.prisma.product.findFirst({
      where: { companyId: requester.companyId, name: { contains: productName, mode: 'insensitive' } },
    });
    if (!product) return { found: false, message: `'${productName}'과 일치하는 제품을 찾지 못했습니다.` };

    const rows = await this.prisma.inventory.findMany({
      where: { productId: product.id },
      include: { warehouse: true },
    });
    return {
      found: true,
      product: { name: product.name, unit: product.unit, safetyStock: product.safetyStock },
      byWarehouse: rows.map((r) => ({ warehouse: r.warehouse.name, quantity: r.quantity })),
    };
  }

  private async getProductInfo(requester: AuthUser, productName: string) {
    const product = await this.prisma.product.findFirst({
      where: { companyId: requester.companyId, name: { contains: productName, mode: 'insensitive' } },
    });
    if (!product) return { found: false, message: `'${productName}'과 일치하는 제품을 찾지 못했습니다.` };
    return {
      found: true,
      name: product.name,
      sku: product.sku,
      category: product.category,
      unit: product.unit,
      salePrice: product.salePrice.toString(),
      costPrice: product.costPrice.toString(),
      safetyStock: product.safetyStock,
      isActive: product.isActive,
    };
  }

  private async getSalesSummary(requester: AuthUser, year?: number, month?: number) {
    const now = new Date();
    const y = year ?? now.getFullYear();
    const m = month ?? now.getMonth() + 1;
    const from = new Date(y, m - 1, 1);
    const to = new Date(y, m, 1);

    const orders = await this.prisma.salesOrder.findMany({
      where: {
        companyId: requester.companyId,
        orderDate: { gte: from, lt: to },
        status: { not: 'CANCELLED' },
      },
      include: { partner: true },
      orderBy: { orderDate: 'desc' },
    });
    if (orders.length === 0)
      return { found: false, message: `${y}년 ${m}월에 발생한 매출 데이터가 없습니다.` };

    const total = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    return {
      found: true,
      year: y,
      month: m,
      orderCount: orders.length,
      totalAmount: total,
      orders: orders.slice(0, 20).map((o) => ({
        orderNo: o.orderNo,
        partner: o.partner.name,
        orderDate: o.orderDate.toISOString().slice(0, 10),
        amount: Number(o.totalAmount),
        status: o.status,
      })),
    };
  }

  private async getPartnerInfo(requester: AuthUser, partnerName?: string) {
    if (partnerName) {
      const partner = await this.prisma.partner.findFirst({
        where: { companyId: requester.companyId, name: { contains: partnerName, mode: 'insensitive' } },
      });
      if (!partner) return { found: false, message: `'${partnerName}'과 일치하는 거래처를 찾지 못했습니다.` };
      return {
        found: true,
        name: partner.name,
        type: partner.type,
        grade: partner.grade,
        phone: partner.phone,
        email: partner.email,
        address: partner.address,
      };
    }
    const partners = await this.prisma.partner.findMany({
      where: { companyId: requester.companyId },
      orderBy: { grade: 'asc' },
      take: 10,
    });
    if (partners.length === 0) return { found: false, message: '등록된 거래처가 없습니다.' };
    return { found: true, items: partners.map((p) => ({ name: p.name, type: p.type, grade: p.grade })) };
  }

  private async getProductionOrdersByStatus(requester: AuthUser, status?: string) {
    const where: Record<string, unknown> = { companyId: requester.companyId };
    if (requester.roleName === 'EMPLOYEE') where.managerId = requester.sub;
    if (status) where.status = status;
    else where.status = { notIn: ['COMPLETED', 'CANCELLED'] };

    const orders = await this.prisma.productionOrder.findMany({
      where,
      include: { product: true },
      orderBy: { dueDate: 'asc' },
      take: 20,
    });
    if (orders.length === 0) return { found: false, message: '조건에 맞는 생산 오더가 없습니다.' };
    return {
      found: true,
      count: orders.length,
      items: orders.map((o) => ({
        orderNo: o.orderNo,
        product: o.product.name,
        planned: o.plannedQty,
        produced: o.producedQty,
        status: o.status,
        dueDate: o.dueDate.toISOString().slice(0, 10),
      })),
    };
  }

  /** ADMIN/HR_MANAGER는 이름으로 타인을 조회할 수 있고, 그 외 역할은 항상 본인으로 강제 스코핑한다 */
  private async resolveTargetEmployee(requester: AuthUser, employeeName?: string) {
    if (requester.roleName !== 'ADMIN' && requester.roleName !== 'HR_MANAGER') {
      return this.prisma.user.findUnique({ where: { id: requester.sub } });
    }
    if (!employeeName) return this.prisma.user.findUnique({ where: { id: requester.sub } });
    const match = await this.prisma.user.findFirst({
      where: { companyId: requester.companyId, name: { contains: employeeName, mode: 'insensitive' } },
    });
    return match ?? this.prisma.user.findUnique({ where: { id: requester.sub } });
  }

  private async getAttendanceSummary(requester: AuthUser, employeeName?: string) {
    const employee = await this.resolveTargetEmployee(requester, employeeName);
    if (!employee) return { found: false, message: '해당 직원을 찾지 못했습니다.' };

    const records = await this.prisma.attendance.findMany({
      where: { userId: employee.id },
      orderBy: { workDate: 'desc' },
      take: 7,
    });
    if (records.length === 0)
      return { found: true, employeeName: employee.name, message: '근태 기록이 없습니다.' };
    return {
      found: true,
      employeeName: employee.name,
      records: records.map((r) => ({
        date: r.workDate.toISOString().slice(0, 10),
        checkIn: r.checkInAt?.toISOString().slice(11, 16) ?? null,
        checkOut: r.checkOutAt?.toISOString().slice(11, 16) ?? null,
        status: r.status,
      })),
    };
  }

  private async getPayrollStatus(requester: AuthUser, employeeName?: string, year?: number, month?: number) {
    const employee = await this.resolveTargetEmployee(requester, employeeName);
    if (!employee) return { found: false, message: '해당 직원을 찾지 못했습니다.' };

    const record = await this.prisma.payroll.findFirst({
      where: {
        userId: employee.id,
        ...(year ? { payYear: year } : {}),
        ...(month ? { payMonth: month } : {}),
      },
      orderBy: [{ payYear: 'desc' }, { payMonth: 'desc' }],
    });
    if (!record) return { found: true, employeeName: employee.name, message: '급여 데이터가 없습니다.' };
    return {
      found: true,
      employeeName: employee.name,
      payYear: record.payYear,
      payMonth: record.payMonth,
      baseSalary: record.baseSalary.toString(),
      netSalary: record.netSalary.toString(),
      status: record.status,
    };
  }

  private async getLeaveBalance(requester: AuthUser, employeeName?: string) {
    const employee = await this.resolveTargetEmployee(requester, employeeName);
    if (!employee) return { found: false, message: '해당 직원을 찾지 못했습니다.' };

    const year = new Date().getFullYear();
    const balance = await this.leaveService.findBalance(employee.id, year);
    return {
      found: true,
      employeeName: employee.name,
      year,
      total: balance.totalDays.toString(),
      used: balance.usedDays.toString(),
      remaining: balance.remainingDays.toString(),
    };
  }

  private async getEmployeeDirectory(requester: AuthUser, employeeName?: string) {
    const where: Record<string, unknown> = { companyId: requester.companyId, status: 'ACTIVE' };
    if (employeeName) where.name = { contains: employeeName, mode: 'insensitive' };

    const employees = await this.prisma.user.findMany({ where, include: { department: true }, take: 10 });
    if (employees.length === 0) return { found: false, message: '일치하는 직원을 찾지 못했습니다.' };
    return {
      found: true,
      items: employees.map((e) => ({
        name: e.name,
        department: e.department?.name ?? '-',
        position: e.position,
        phone: e.phone,
      })),
    };
  }

  private async getAnnouncements(requester: AuthUser) {
    const announcements = await this.prisma.announcement.findMany({
      where: {
        companyId: requester.companyId,
        OR: [{ targetRoleId: null }, { targetRoleId: requester.roleId }],
      },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      take: 5,
    });
    if (announcements.length === 0) return { found: false, message: '공지사항이 없습니다.' };
    return {
      found: true,
      items: announcements.map((a) => ({
        title: a.title,
        content: a.content,
        publishedAt: a.publishedAt.toISOString().slice(0, 10),
        isPinned: a.isPinned,
      })),
    };
  }

  private async searchInternalDocuments(requester: AuthUser, query: string) {
    const documents = await this.prisma.document.findMany({
      where: {
        companyId: requester.companyId,
        indexStatus: 'DONE',
        OR: [{ isPublic: true }, { departmentId: requester.departmentId }],
        AND: query
          ? [
              {
                OR: [
                  { title: { contains: query, mode: 'insensitive' } },
                  { summary: { contains: query, mode: 'insensitive' } },
                ],
              },
            ]
          : undefined,
      },
      take: 5,
    });
    if (documents.length === 0) return { found: false, message: '관련 문서를 찾지 못했습니다.' };
    return {
      found: true,
      items: documents.map((d) => ({ title: d.title, summary: d.summary, category: d.category })),
    };
  }
}
