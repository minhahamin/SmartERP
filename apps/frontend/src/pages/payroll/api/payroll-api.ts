import { PAYROLL_SEED, generatePayrollForMonth, type PayrollRecord } from '@/mocks/payroll';
import { delay } from '@/mocks/delay';

let payrollDb: PayrollRecord[] = [...PAYROLL_SEED];

function recompute(record: PayrollRecord): PayrollRecord {
  const totalAllow = Object.values(record.allowances).reduce((a, b) => a + b, 0);
  const totalDeduct = Object.values(record.deductions).reduce((a, b) => a + b, 0);
  return { ...record, netSalary: record.baseSalary + totalAllow - totalDeduct };
}

export async function listPayroll(year: number, month: number): Promise<PayrollRecord[]> {
  await delay();
  return payrollDb.filter((p) => p.payYear === year && p.payMonth === month);
}

export async function getMyPayroll(employeeId: string): Promise<PayrollRecord[]> {
  await delay();
  return payrollDb
    .filter((p) => p.employeeId === employeeId)
    .sort((a, b) => b.payYear * 12 + b.payMonth - (a.payYear * 12 + a.payMonth));
}

export async function generateMonthlyPayroll(year: number, month: number): Promise<PayrollRecord[]> {
  await delay(500);
  const exists = payrollDb.some((p) => p.payYear === year && p.payMonth === month);
  if (!exists) {
    payrollDb = [...payrollDb, ...generatePayrollForMonth(year, month)];
  }
  return listPayroll(year, month);
}

export async function updatePayrollItem(
  id: string,
  input: { allowances: Record<string, number>; deductions: Record<string, number> },
): Promise<PayrollRecord> {
  await delay(350);
  payrollDb = payrollDb.map((p) => (p.id === id ? recompute({ ...p, ...input }) : p));
  const updated = payrollDb.find((p) => p.id === id);
  if (!updated) throw new Error('급여 항목을 찾을 수 없습니다.');
  return updated;
}

export async function transitionPayrollStatus(id: string, status: 'CONFIRMED' | 'PAID'): Promise<PayrollRecord> {
  await delay(400);
  payrollDb = payrollDb.map((p) => (p.id === id ? { ...p, status } : p));
  const updated = payrollDb.find((p) => p.id === id);
  if (!updated) throw new Error('급여 항목을 찾을 수 없습니다.');
  return updated;
}

export async function bulkConfirmPayroll(year: number, month: number): Promise<void> {
  await delay(500);
  payrollDb = payrollDb.map((p) =>
    p.payYear === year && p.payMonth === month && p.status === 'DRAFT' ? { ...p, status: 'CONFIRMED' as const } : p,
  );
}

export async function bulkPayPayroll(year: number, month: number): Promise<void> {
  await delay(500);
  payrollDb = payrollDb.map((p) =>
    p.payYear === year && p.payMonth === month && p.status === 'CONFIRMED' ? { ...p, status: 'PAID' as const } : p,
  );
}
