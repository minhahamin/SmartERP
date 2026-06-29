import { apiClient, type ApiSuccess } from '@/lib/api/client';

export type PartnerType = 'CUSTOMER' | 'VENDOR' | 'BOTH';
export type PartnerGrade = 'A' | 'B' | 'C';

export interface Partner {
  id: string;
  name: string;
  bizRegNo: string;
  type: PartnerType;
  ceoName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  grade: PartnerGrade;
  managerId: string | null;
}

export interface PartnerListQuery {
  search?: string;
  type?: PartnerType;
}

export interface PartnerInput {
  name: string;
  bizRegNo: string;
  type: PartnerType;
  ceoName?: string;
  phone?: string;
  email?: string;
  address?: string;
  grade: PartnerGrade;
  managerId?: string;
}

export async function listPartners(query: PartnerListQuery): Promise<Partner[]> {
  const { data } = await apiClient.get<ApiSuccess<Partner[]>>('/partners', {
    params: { ...query, page: 1, limit: 100 },
  });
  return data.data;
}

export async function createPartner(input: PartnerInput): Promise<Partner> {
  const { data } = await apiClient.post<ApiSuccess<Partner>>('/partners', input);
  return data.data;
}

export async function updatePartner(id: string, input: PartnerInput): Promise<Partner> {
  const { data } = await apiClient.patch<ApiSuccess<Partner>>(`/partners/${id}`, input);
  return data.data;
}
