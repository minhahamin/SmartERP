import { EMPLOYEES, getEmployeeById } from '@/mocks/employees';
import { DEPARTMENTS } from '@/mocks/departments';
import { PARTNERS } from '@/mocks/partners';
import { PRODUCTS, getProductById } from '@/mocks/products';
import { getInventorySnapshot } from '@/mocks/inventory-store';
import { getWarehouseById } from '@/mocks/warehouse-store';
import { SALES_ORDERS } from '@/mocks/sales-orders';
import { PRODUCTION_ORDERS, type ProductionStatus } from '@/mocks/production-orders';
import { getDocumentSnapshot } from '@/mocks/document-store';
import { getDocumentFolderById } from '@/mocks/document-folder-store';
import { ANNOUNCEMENTS } from '@/mocks/announcements';
import { PAYROLL_SEED } from '@/mocks/payroll';
import { generateAttendance } from '@/mocks/attendance';
import { getLeaveBalance } from '@/mocks/leave';
import { ROLE_LABEL, type RoleName } from '@/types/auth';
import type { CitationCardData, MessageSourceType, TableCardData } from '@/pages/ai-assistant/api/types';

export interface AssistantContext {
  role: RoleName;
  userId: string;
}

export interface AssistantReply {
  content: string;
  sourceType: MessageSourceType;
  tableData?: TableCardData;
  citation?: CitationCardData;
}

class ForbiddenToolError extends Error {}

/**
 * docs/09-ai-chatbot-design.md 9.3의 이중 방어 구조를 모사한다.
 * 1) 호출자의 역할이 도구 허용 목록에 없으면 즉시 차단(노출 단계 필터링에 해당)
 * 2) EMPLOYEE 역할은 인자에 어떤 이름이 들어와도 본인 ID로 강제 치환(실행 단계 강제 스코핑)
 */
function ensureRole(ctx: AssistantContext, allowed: RoleName[], resourceLabel: string) {
  if (!allowed.includes(ctx.role)) {
    throw new ForbiddenToolError(
      `'${resourceLabel}' 데이터는 현재 역할(${ROLE_LABEL[ctx.role]})로 조회할 수 없습니다. 권한이 필요하면 관리자에게 문의해주세요.`,
    );
  }
}

function resolveTargetEmployeeId(ctx: AssistantContext, requestedName: string | undefined) {
  if (ctx.role === 'EMPLOYEE') return ctx.userId; // 강제 오버라이드 — 본인 데이터로만 스코프 고정
  if (!requestedName) return ctx.userId;
  const match = findEmployeeByName(requestedName);
  return match?.id ?? ctx.userId;
}

function findEmployeeByName(question: string) {
  return EMPLOYEES.filter((e) => question.includes(e.name)).sort((a, b) => b.name.length - a.name.length)[0];
}

function findProductByName(question: string) {
  return PRODUCTS.filter((p) => question.includes(p.name)).sort((a, b) => b.name.length - a.name.length)[0];
}

function findPartnerByName(question: string) {
  return PARTNERS.filter((p) => question.includes(p.name)).sort((a, b) => b.name.length - a.name.length)[0];
}

function departmentName(departmentId: string) {
  return DEPARTMENTS.find((d) => d.id === departmentId)?.name ?? '-';
}

// ── 개별 도구(Tool) 구현 ──────────────────────────────────────────────

function toolGetLowStockProducts(ctx: AssistantContext): AssistantReply {
  ensureRole(ctx, ['ADMIN', 'SALES_MANAGER'], '재고');
  const rows = getInventorySnapshot()
    .map((i) => ({ ...i, product: getProductById(i.productId) }))
    .filter((i) => i.product && i.quantity < i.product.safetyStock);

  if (rows.length === 0) {
    return { content: '현재 안전재고 기준 미달 품목이 없습니다.', sourceType: 'data' };
  }

  return {
    content: `안전재고 기준 미달 품목은 ${rows.length}건입니다.`,
    sourceType: 'data',
    tableData: {
      columns: ['제품명', '현재고', '안전재고', '창고'],
      rows: rows.map((r) => [r.product!.name, r.quantity, r.product!.safetyStock, getWarehouseById(r.warehouseId)?.name ?? r.warehouseId]),
      conditionText: '전체 창고 · 현재고 ≤ 안전재고',
      linkLabel: '재고 관리에서 보기',
      linkTo: '/inventory',
    },
  };
}

function toolGetInventoryByProduct(ctx: AssistantContext, question: string): AssistantReply {
  ensureRole(ctx, ['ADMIN', 'SALES_MANAGER', 'EMPLOYEE'], '재고');
  const product = findProductByName(question);
  if (!product) return toolGetLowStockProducts(ctx);

  const rows = getInventorySnapshot().filter((i) => i.productId === product.id);
  return {
    content: `${product.name}의 창고별 재고 현황입니다.`,
    sourceType: 'data',
    tableData: {
      columns: ['창고', '현재고', '안전재고'],
      rows: rows.map((r) => [getWarehouseById(r.warehouseId)?.name ?? r.warehouseId, r.quantity, product.safetyStock]),
      conditionText: `제품: ${product.name}`,
      linkLabel: '제품 상세에서 보기',
      linkTo: `/products/${product.id}`,
    },
  };
}

function toolGetSalesSummary(ctx: AssistantContext): AssistantReply {
  ensureRole(ctx, ['ADMIN', 'SALES_MANAGER'], '매출');
  const orders = SALES_ORDERS.filter((o) => o.orderDate.startsWith('2026-06') && o.status !== 'CANCELLED');
  const total = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  return {
    content: `이번 달(6월) 매출은 총 ₩${total.toLocaleString()}이며, ${orders.length}건의 주문이 발생했습니다.`,
    sourceType: 'data',
    tableData: {
      columns: ['주문번호', '거래처', '주문일', '금액'],
      rows: orders.map((o) => [o.orderNo, PARTNERS.find((p) => p.id === o.partnerId)?.name ?? '-', o.orderDate, `₩${o.totalAmount.toLocaleString()}`]),
      conditionText: '2026년 6월 · 취소 제외',
      linkLabel: '통계 분석에서 보기',
      linkTo: '/statistics',
    },
  };
}

function toolGetPartnerInfo(ctx: AssistantContext, question: string): AssistantReply {
  ensureRole(ctx, ['ADMIN', 'SALES_MANAGER'], '거래처');
  const partner = findPartnerByName(question);
  if (!partner) {
    return {
      content: '거래처명을 찾지 못해 등급이 높은 거래처 상위 목록을 보여드립니다.',
      sourceType: 'data',
      tableData: {
        columns: ['거래처명', '유형', '등급', '최근거래일'],
        rows: PARTNERS.slice(0, 5).map((p) => [p.name, p.type, `${p.grade}등급`, p.lastOrderDate]),
        conditionText: '전체 거래처',
        linkLabel: '거래처 관리에서 보기',
        linkTo: '/partners',
      },
    };
  }

  return {
    content: `${partner.name}의 거래처 정보입니다. 담당자: ${getEmployeeById(partner.managerId)?.name ?? '-'}`,
    sourceType: 'data',
    tableData: {
      columns: ['항목', '내용'],
      rows: [
        ['유형', partner.type],
        ['등급', `${partner.grade}등급`],
        ['연락처', partner.phone],
        ['최근 거래일', partner.lastOrderDate],
      ],
      conditionText: `거래처: ${partner.name}`,
      linkLabel: '거래처 관리에서 보기',
      linkTo: '/partners',
    },
  };
}

function toolGetProductionOrdersByStatus(ctx: AssistantContext, statusFilter: ProductionStatus | undefined): AssistantReply {
  ensureRole(ctx, ['ADMIN', 'SALES_MANAGER', 'EMPLOYEE'], '생산');
  const orders = statusFilter
    ? PRODUCTION_ORDERS.filter((o) => o.status === statusFilter)
    : PRODUCTION_ORDERS.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');

  if (orders.length === 0) {
    return { content: '조건에 맞는 생산 오더가 없습니다.', sourceType: 'data' };
  }

  return {
    content: `${statusFilter === 'DELAYED' ? '생산 지연 중인' : '진행 중인'} 작업은 ${orders.length}건입니다.`,
    sourceType: 'data',
    tableData: {
      columns: ['오더번호', '제품', '계획/생산', '마감일', '상태'],
      rows: orders.map((o) => [o.orderNo, getProductById(o.productId)?.name ?? '-', `${o.producedQty}/${o.plannedQty}`, o.dueDate, o.status]),
      conditionText: statusFilter ? `상태 = ${statusFilter}` : '진행중/지연',
      linkLabel: '생산 관리에서 보기',
      linkTo: '/production',
    },
  };
}

function toolGetAttendanceSummary(ctx: AssistantContext, question: string): AssistantReply {
  ensureRole(ctx, ['ADMIN', 'HR_MANAGER', 'EMPLOYEE'], '근태');
  const requestedName = findEmployeeByName(question)?.name;
  const targetId = resolveTargetEmployeeId(ctx, requestedName);
  const employee = getEmployeeById(targetId);
  if (!employee) return { content: '해당 직원을 찾을 수 없습니다.', sourceType: 'none' };

  const records = generateAttendance(employee.id);
  return {
    content: `${employee.name}님의 이번 주 근태 현황입니다.`,
    sourceType: 'data',
    tableData: {
      columns: ['날짜', '출근', '퇴근', '상태'],
      rows: records.map((r) => [r.date, r.checkInAt ?? '-', r.checkOutAt ?? '-', r.status]),
      conditionText: `대상: ${employee.name} (${departmentName(employee.departmentId)})`,
      linkLabel: '직원 상세에서 보기',
      linkTo: `/employees/${employee.id}`,
    },
  };
}

function toolGetPayrollStatus(ctx: AssistantContext, question: string): AssistantReply {
  ensureRole(ctx, ['ADMIN', 'HR_MANAGER', 'EMPLOYEE'], '급여');
  const requestedName = findEmployeeByName(question)?.name;
  const targetId = resolveTargetEmployeeId(ctx, requestedName);
  const employee = getEmployeeById(targetId);
  if (!employee) return { content: '해당 직원을 찾을 수 없습니다.', sourceType: 'none' };

  const record = PAYROLL_SEED.filter((p) => p.employeeId === employee.id).sort((a, b) => b.payMonth - a.payMonth)[0];
  if (!record) return { content: `${employee.name}님의 급여 데이터가 없습니다.`, sourceType: 'none' };

  return {
    content: `${employee.name}님의 ${record.payYear}년 ${record.payMonth}월 급여는 ${record.status} 상태입니다.`,
    sourceType: 'data',
    tableData: {
      columns: ['귀속월', '기본급', '실지급액', '상태'],
      rows: [[`${record.payYear}-${String(record.payMonth).padStart(2, '0')}`, `₩${record.baseSalary.toLocaleString()}`, `₩${record.netSalary.toLocaleString()}`, record.status]],
      conditionText: `대상: ${employee.name}`,
      linkLabel: '급여 관리에서 보기',
      linkTo: '/payroll',
    },
  };
}

function toolGetLeaveBalance(ctx: AssistantContext, question: string): AssistantReply {
  const requestedName = findEmployeeByName(question)?.name;
  const targetId = resolveTargetEmployeeId(ctx, requestedName);
  const employee = getEmployeeById(targetId);
  if (!employee) return { content: '해당 직원을 찾을 수 없습니다.', sourceType: 'none' };

  const balance = getLeaveBalance(employee.id);
  return {
    content: `${employee.name}님의 연차는 총 ${balance.total}일 중 ${balance.used}일을 사용해 ${balance.remaining}일이 남아있습니다.`,
    sourceType: 'data',
    tableData: {
      columns: ['총 연차', '사용', '잔여'],
      rows: [[`${balance.total}일`, `${balance.used}일`, `${balance.remaining}일`]],
      conditionText: `대상: ${employee.name}`,
      linkLabel: '직원 상세에서 보기',
      linkTo: `/employees/${employee.id}`,
    },
  };
}

function toolGetEmployeeDirectory(question: string): AssistantReply {
  const match = findEmployeeByName(question);
  const targets = match ? [match] : EMPLOYEES.filter((e) => e.status === 'ACTIVE').slice(0, 5);

  return {
    content: match ? `${match.name}님의 연락처 정보입니다.` : '연락처 정보 상위 5명을 보여드립니다.',
    sourceType: 'data',
    tableData: {
      columns: ['이름', '부서', '직급', '연락처'],
      rows: targets.map((e) => [e.name, departmentName(e.departmentId), e.position, e.phone]),
      conditionText: match ? `대상: ${match.name}` : '전체 직원',
      linkLabel: '직원 관리에서 보기',
      linkTo: '/employees',
    },
  };
}

function toolGetAnnouncements(): AssistantReply {
  const latest = ANNOUNCEMENTS.slice(0, 3);
  return {
    content: '최근 공지사항입니다.',
    sourceType: 'data',
    tableData: {
      columns: ['제목', '대상', '게시일'],
      rows: latest.map((a) => [a.title, a.scope, a.publishedAt]),
      conditionText: '최신 3건',
      linkLabel: '공지사항에서 보기',
      linkTo: '/announcements',
    },
  };
}

function toolSearchInternalDocuments(question: string): AssistantReply {
  const scored = getDocumentSnapshot().filter((d) => d.isPublic && d.indexStatus === 'DONE').map((d) => {
    const haystack = `${d.title} ${d.summary} ${getDocumentFolderById(d.folderId)?.name ?? ''}`;
    const score = haystack.includes(question) ? 1 : question.split(/\s+/).filter((token) => token.length > 1 && haystack.includes(token)).length;
    return { doc: d, score };
  });
  const best = scored.sort((a, b) => b.score - a.score)[0];

  if (!best || best.score === 0) {
    return { content: '관련 문서를 찾지 못했습니다. 다른 키워드로 다시 질문해주세요.', sourceType: 'none' };
  }

  return {
    content: best.doc.summary || `'${best.doc.title}' 문서를 참고해주세요.`,
    sourceType: 'document',
    citation: { documentTitle: best.doc.title },
  };
}

// ── 라우팅: 질문 → 의도 분류 → 도구 실행 ──────────────────────────────

export function generateAssistantReply(question: string, ctx: AssistantContext): AssistantReply {
  try {
    if (/규정|정책|취업규칙|매뉴얼|가이드|사용법|평가\s?기준/.test(question)) {
      return toolSearchInternalDocuments(question);
    }
    if (/급여|연봉|월급/.test(question)) {
      return toolGetPayrollStatus(ctx, question);
    }
    if (/근태|출퇴근|출근현황|결근/.test(question)) {
      return toolGetAttendanceSummary(ctx, question);
    }
    if (/연차|휴가/.test(question)) {
      return toolGetLeaveBalance(ctx, question);
    }
    if (/재고/.test(question) && /부족|이하|미달/.test(question)) {
      return toolGetLowStockProducts(ctx);
    }
    if (/재고/.test(question)) {
      return toolGetInventoryByProduct(ctx, question);
    }
    if (/매출/.test(question)) {
      return toolGetSalesSummary(ctx);
    }
    if (/거래처/.test(question)) {
      return toolGetPartnerInfo(ctx, question);
    }
    if (/생산/.test(question)) {
      return toolGetProductionOrdersByStatus(ctx, /지연/.test(question) ? 'DELAYED' : undefined);
    }
    if (/연락처|전화번호|직원.*(찾|어디)/.test(question)) {
      return toolGetEmployeeDirectory(question);
    }
    if (/공지/.test(question)) {
      return toolGetAnnouncements();
    }
    return toolSearchInternalDocuments(question);
  } catch (error) {
    if (error instanceof ForbiddenToolError) {
      return { content: error.message, sourceType: 'denied' };
    }
    throw error;
  }
}
