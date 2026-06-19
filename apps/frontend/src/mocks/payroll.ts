export type PayrollStatus = 'DRAFT' | 'CONFIRMED' | 'PAID';

export interface PayrollRecord {
  id: string;
  employeeId: string;
  payYear: number;
  payMonth: number;
  baseSalary: number;
  allowances: Record<string, number>;
  deductions: Record<string, number>;
  netSalary: number;
  status: PayrollStatus;
}

export const BASE_SALARY: Record<string, number> = {
  'emp-1000': 8_000_000,
  'emp-1024': 3_200_000,
  'emp-1025': 2_900_000,
  'emp-1031': 2_800_000,
  'emp-1042': 3_000_000,
  'emp-1077': 2_700_000,
  'emp-1101': 2_950_000,
  'emp-1102': 2_750_000,
  'emp-1103': 2_650_000,
  'emp-1104': 2_650_000,
  'emp-1105': 2_650_000,
  'emp-1106': 2_700_000,
  'emp-1107': 2_650_000,
  'emp-1108': 2_600_000,
};

const POSITION_ALLOWANCE: Record<string, number> = {
  'emp-1000': 1_000_000,
  'emp-1024': 150_000,
  'emp-1042': 100_000,
};

function round1000(value: number) {
  return Math.round(value / 1000) * 1000;
}

function buildAllowances(employeeId: string): Record<string, number> {
  const positionAllowance = POSITION_ALLOWANCE[employeeId] ?? 0;
  const allowances: Record<string, number> = { 식대: 100_000 };
  if (positionAllowance > 0) allowances['직책수당'] = positionAllowance;
  return allowances;
}

function buildDeductions(base: number): Record<string, number> {
  return {
    국민연금: round1000(base * 0.045),
    건강보험: round1000(base * 0.035),
    소득세: round1000(base * 0.017),
  };
}

function sum(values: Record<string, number>) {
  return Object.values(values).reduce((a, b) => a + b, 0);
}

function buildRecord(employeeId: string, year: number, month: number, status: PayrollStatus): PayrollRecord {
  const base = BASE_SALARY[employeeId] ?? 2_800_000;
  const allowances = buildAllowances(employeeId);
  const deductions = buildDeductions(base);
  const netSalary = base + sum(allowances) - sum(deductions);
  return {
    id: `payroll-${employeeId}-${year}${String(month).padStart(2, '0')}`,
    employeeId,
    payYear: year,
    payMonth: month,
    baseSalary: base,
    allowances,
    deductions,
    netSalary,
    status,
  };
}

const PAYROLL_EMPLOYEE_IDS = Object.keys(BASE_SALARY);

// 6월: 와이어프레임과 동일하게 일부만 CONFIRMED, 나머지는 DRAFT로 시작
const JUNE_CONFIRMED = new Set(['emp-1024', 'emp-1031']);

export const PAYROLL_SEED: PayrollRecord[] = [
  ...PAYROLL_EMPLOYEE_IDS.map((id) => buildRecord(id, 2026, 4, 'PAID')),
  ...PAYROLL_EMPLOYEE_IDS.map((id) => buildRecord(id, 2026, 5, 'PAID')),
  ...PAYROLL_EMPLOYEE_IDS.map((id) => buildRecord(id, 2026, 6, JUNE_CONFIRMED.has(id) ? 'CONFIRMED' : 'DRAFT')),
];

export function generatePayrollForMonth(year: number, month: number): PayrollRecord[] {
  return PAYROLL_EMPLOYEE_IDS.map((id) => buildRecord(id, year, month, 'DRAFT'));
}
