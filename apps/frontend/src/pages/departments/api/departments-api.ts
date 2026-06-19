import { DEPARTMENTS, type Department } from '@/mocks/departments';
import { delay } from '@/mocks/delay';

let departmentDb: Department[] = [...DEPARTMENTS];

export interface CreateDepartmentInput {
  name: string;
  parentId: string | null;
}

export interface UpdateDepartmentInput {
  parentId?: string | null;
  managerId?: string | null;
}

export async function listDepartments(): Promise<Department[]> {
  await delay(250);
  return departmentDb;
}

export async function createDepartment(input: CreateDepartmentInput): Promise<Department> {
  await delay(350);
  const department: Department = { id: `dept-${Date.now()}`, managerId: null, ...input };
  departmentDb = [...departmentDb, department];
  return department;
}

export async function updateDepartment(id: string, input: UpdateDepartmentInput): Promise<Department> {
  await delay(350);
  departmentDb = departmentDb.map((d) => (d.id === id ? { ...d, ...input } : d));
  const updated = departmentDb.find((d) => d.id === id);
  if (!updated) throw new Error('부서를 찾을 수 없습니다.');
  return updated;
}
