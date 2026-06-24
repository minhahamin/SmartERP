import { apiClient, type ApiSuccess } from '@/lib/api/client';
import type { AuthUser, RoleName } from '@/types/auth';

interface UserPayload {
  id: string;
  name: string;
  email: string;
  role: RoleName;
  departmentName: string | null;
  position: string | null;
  mustChangePassword: boolean;
}

interface LoginResponseData {
  accessToken: string;
  user: UserPayload;
}

interface RefreshResponseData {
  accessToken: string;
}

interface MeResponseData extends UserPayload {
  permissions: string[];
}

function toAuthUser(data: UserPayload): AuthUser {
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role,
    departmentName: data.departmentName ?? '-',
    position: data.position ?? '-',
    mustChangePassword: data.mustChangePassword,
  };
}

export async function login(email: string, password: string, rememberMe?: boolean) {
  const { data } = await apiClient.post<ApiSuccess<LoginResponseData>>('/auth/login', {
    email,
    password,
    rememberMe,
  });
  return { accessToken: data.data.accessToken, user: toAuthUser(data.data.user) };
}

export async function register(companyName: string, bizRegNo: string, adminName: string, email: string, password: string) {
  const { data } = await apiClient.post<ApiSuccess<LoginResponseData>>('/auth/register', {
    companyName,
    bizRegNo,
    adminName,
    email,
    password,
  });
  return { accessToken: data.data.accessToken, user: toAuthUser(data.data.user) };
}

export async function refresh() {
  const { data } = await apiClient.post<ApiSuccess<RefreshResponseData>>('/auth/refresh');
  return data.data.accessToken;
}

export async function me() {
  const { data } = await apiClient.get<ApiSuccess<MeResponseData>>('/auth/me');
  return toAuthUser(data.data);
}

export async function logout() {
  await apiClient.post('/auth/logout');
}

export async function changePassword(currentPassword: string, newPassword: string) {
  await apiClient.post('/auth/change-password', { currentPassword, newPassword });
}
