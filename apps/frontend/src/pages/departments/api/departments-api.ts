import { apiClient, type ApiSuccess } from '@/lib/api/client';

export interface Department {
  id: string;
  name: string;
  parentId: string | null;
  managerId: string | null;
}

export interface CreateDepartmentInput {
  name: string;
  parentId: string | null;
}

export interface UpdateDepartmentInput {
  parentId?: string | null;
  managerId?: string | null;
}

export async function listDepartments(): Promise<Department[]> {
  const { data } = await apiClient.get<ApiSuccess<Department[]>>('/departments');
  return data.data;
}

export async function createDepartment(input: CreateDepartmentInput): Promise<Department> {
  const { data } = await apiClient.post<ApiSuccess<Department>>('/departments', input);
  return data.data;
}

export async function updateDepartment(id: string, input: UpdateDepartmentInput): Promise<Department> {
  const { data } = await apiClient.patch<ApiSuccess<Department>>(`/departments/${id}`, input);
  return data.data;
}
