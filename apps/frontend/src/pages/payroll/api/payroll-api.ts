import { apiClient, type ApiSuccess } from '@/lib/api/client';

export type PayrollStatus = 'DRAFT' | 'CONFIRMED' | 'PAID';

export interface PayrollEmployee {
  id: string;
  employeeNo: string;
  name: string;
  department: { id: string; name: string } | null;
}

export interface PayrollRecord {
  id: string;
  userId: string;
  payYear: number;
  payMonth: number;
  baseSalary: number;
  allowances: Record<string, number>;
  deductions: Record<string, number>;
  netSalary: number;
  status: PayrollStatus;
  /** 급여 목록(GET /payrolls)에만 포함되고, 본인 조회(GET /payrolls/me)에는 없다 */
  user?: PayrollEmployee;
}

interface RawPayroll extends Omit<PayrollRecord, 'baseSalary' | 'netSalary'> {
  baseSalary: string | number;
  netSalary: string | number;
}

/** Prisma Decimal은 JSON으로 문자열화되어 내려오므로 숫자로 변환한다 */
function toPayrollRecord(raw: RawPayroll): PayrollRecord {
  return { ...raw, baseSalary: Number(raw.baseSalary), netSalary: Number(raw.netSalary) };
}

export async function listPayroll(year: number, month: number): Promise<PayrollRecord[]> {
  const { data } = await apiClient.get<ApiSuccess<RawPayroll[]>>('/payrolls', {
    params: { year, month, limit: 100 },
  });
  return data.data.map(toPayrollRecord);
}

export async function getMyPayroll(): Promise<PayrollRecord[]> {
  const { data } = await apiClient.get<ApiSuccess<RawPayroll[]>>('/payrolls/me');
  return data.data.map(toPayrollRecord);
}

export async function listPayrollHistoryForUser(userId: string): Promise<PayrollRecord[]> {
  const { data } = await apiClient.get<ApiSuccess<RawPayroll[]>>(`/users/${userId}/payrolls`);
  return data.data.map(toPayrollRecord);
}

export async function generateMonthlyPayroll(year: number, month: number): Promise<PayrollRecord[]> {
  const { data } = await apiClient.post<ApiSuccess<RawPayroll[]>>('/payrolls/generate', { year, month });
  return data.data.map(toPayrollRecord);
}

export async function updatePayrollItem(
  id: string,
  input: { allowances: Record<string, number>; deductions: Record<string, number> },
): Promise<PayrollRecord> {
  const { data } = await apiClient.patch<ApiSuccess<RawPayroll>>(`/payrolls/${id}`, input);
  return toPayrollRecord(data.data);
}

export async function transitionPayrollStatus(id: string, status: 'CONFIRMED' | 'PAID'): Promise<PayrollRecord> {
  const action = status === 'CONFIRMED' ? 'confirm' : 'pay';
  const { data } = await apiClient.post<ApiSuccess<RawPayroll>>(`/payrolls/${id}/${action}`);
  return toPayrollRecord(data.data);
}

/** 백엔드에 일괄 확정/지급 엔드포인트가 없으므로, 대상 건을 모아 개별 confirm/pay를 병렬 호출한다 */
export async function bulkConfirmPayroll(year: number, month: number): Promise<void> {
  const records = await listPayroll(year, month);
  await Promise.all(
    records.filter((r) => r.status === 'DRAFT').map((r) => transitionPayrollStatus(r.id, 'CONFIRMED')),
  );
}

export async function bulkPayPayroll(year: number, month: number): Promise<void> {
  const records = await listPayroll(year, month);
  await Promise.all(
    records.filter((r) => r.status === 'CONFIRMED').map((r) => transitionPayrollStatus(r.id, 'PAID')),
  );
}
