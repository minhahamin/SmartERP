import { apiClient, type ApiSuccess } from '@/lib/api/client';

export type SearchResultType = 'product' | 'partner' | 'employee' | 'document' | 'announcement' | 'production' | 'warehouse';

export interface SearchResultItem {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string | null;
  path: string;
}

export async function searchGlobal(q: string): Promise<SearchResultItem[]> {
  const { data } = await apiClient.get<ApiSuccess<SearchResultItem[]>>('/search', { params: { q } });
  return data.data;
}
