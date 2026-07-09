import { apiClient, type ApiSuccess } from '@/lib/api/client';

export type EmployeeStatus = 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED';

export interface Employee {
  id: string;
  employeeNo: string;
  name: string;
  email: string;
  phone: string | null;
  departmentId: string | null;
  department: { id: string; name: string } | null;
  roleId: string;
  role: { id: string; name: string };
  position: string | null;
  hireDate: string;
  status: EmployeeStatus;
  /** Prisma Decimal은 JSON으로 문자열화되어 내려온다 */
  baseSalary: string | null;
}

export interface DepartmentOption {
  id: string;
  name: string;
}

export interface RoleOption {
  id: string;
  name: string;
}

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
  phone?: string;
  departmentId?: string;
  roleId: string;
  position?: string;
  hireDate: string;
  baseSalary?: number;
}

export type UpdateEmployeeInput = Partial<CreateEmployeeInput> & { status?: EmployeeStatus };

/** 백엔드는 이메일 발송 없이 임시 비밀번호를 그대로 응답에 담아 반환한다(docs/02 2.4) — 관리자가 직접 전달해야 한다 */
export interface CreatedEmployee extends Employee {
  temporaryPassword: string;
}

export async function listEmployees(query: EmployeeListQuery): Promise<EmployeeListResult> {
  const { data } = await apiClient.get<ApiSuccess<Employee[]>>('/users', { params: query });
  return {
    items: data.data,
    total: data.meta?.total ?? data.data.length,
    totalPages: data.meta?.totalPages ?? 1,
  };
}

export async function getEmployee(id: string): Promise<Employee> {
  const { data } = await apiClient.get<ApiSuccess<Employee>>(`/users/${id}`);
  return data.data;
}

export async function createEmployee(input: CreateEmployeeInput): Promise<CreatedEmployee> {
  const { data } = await apiClient.post<ApiSuccess<CreatedEmployee>>('/users', input);
  return data.data;
}

export async function updateEmployee(id: string, input: UpdateEmployeeInput): Promise<Employee> {
  const { data } = await apiClient.patch<ApiSuccess<Employee>>(`/users/${id}`, input);
  return data.data;
}

export async function deactivateEmployee(id: string): Promise<void> {
  await apiClient.delete(`/users/${id}`);
}

/** 직원 등록/수정 폼의 부서 선택 옵션 — 부서 관리 화면(아직 mock)과는 무관하게 실데이터를 직접 조회한다 */
export async function listDepartmentOptions(): Promise<DepartmentOption[]> {
  const { data } = await apiClient.get<ApiSuccess<DepartmentOption[]>>('/departments');
  return data.data;
}

/** 직원 등록/수정 폼·공지사항 대상 선택 등에 쓰이는 역할 이름 옵션(권한 정보 없이 id/name만, 전 직원 접근 가능) */
export async function listRoleOptions(): Promise<RoleOption[]> {
  const { data } = await apiClient.get<ApiSuccess<RoleOption[]>>('/roles/options');
  return data.data;
}
