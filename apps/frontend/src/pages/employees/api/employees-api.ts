import { EMPLOYEES, type Employee, type EmployeeStatus } from '@/mocks/employees';
import type { RoleName } from '@/types/auth';
import { delay } from '@/mocks/delay';

let employeeDb: Employee[] = [...EMPLOYEES];

export interface EmployeeListQuery {
  search?: string;
  departmentId?: string;
  status?: EmployeeStatus;
  page: number;
  limit: number;
}

export interface EmployeeListResult {
  items: Employee[];
  total: number;
  totalPages: number;
}

export interface CreateEmployeeInput {
  name: string;
  email: string;
  phone: string;
  departmentId: string;
  role: RoleName;
  position: string;
  hireDate: string;
}

export type UpdateEmployeeInput = Partial<CreateEmployeeInput>;

export async function listEmployees(query: EmployeeListQuery): Promise<EmployeeListResult> {
  await delay();
  let items = [...employeeDb];

  if (query.search) {
    const keyword = query.search.trim().toLowerCase();
    items = items.filter(
      (e) => e.name.toLowerCase().includes(keyword) || e.employeeNo.toLowerCase().includes(keyword),
    );
  }
  if (query.departmentId) {
    items = items.filter((e) => e.departmentId === query.departmentId);
  }
  if (query.status) {
    items = items.filter((e) => e.status === query.status);
  }

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / query.limit));
  const start = (query.page - 1) * query.limit;
  const paged = items.slice(start, start + query.limit);

  return { items: paged, total, totalPages };
}

export async function getEmployee(id: string): Promise<Employee | undefined> {
  await delay(250);
  return employeeDb.find((e) => e.id === id);
}

export async function createEmployee(input: CreateEmployeeInput): Promise<Employee> {
  await delay(400);
  const nextSeq = employeeDb.length + 1024;
  const employee: Employee = {
    id: `emp-${Date.now()}`,
    employeeNo: `E-${nextSeq}`,
    status: 'ACTIVE',
    ...input,
  };
  employeeDb = [employee, ...employeeDb];
  return employee;
}

export async function updateEmployee(id: string, input: UpdateEmployeeInput): Promise<Employee> {
  await delay(400);
  employeeDb = employeeDb.map((e) => (e.id === id ? { ...e, ...input } : e));
  const updated = employeeDb.find((e) => e.id === id);
  if (!updated) throw new Error('직원을 찾을 수 없습니다.');
  return updated;
}

export async function deactivateEmployee(id: string): Promise<void> {
  await delay(400);
  employeeDb = employeeDb.map((e) => (e.id === id ? { ...e, status: 'RESIGNED' as const } : e));
}
