import { apiClient, type ApiSuccess } from '@/lib/api/client';

export type DocumentCategory = 'POLICY' | 'CONTRACT' | 'REPORT' | 'MANUAL' | 'HR' | 'ETC';
export type DocumentIndexStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

export interface AppDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  folderId: string | null;
  version: number;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  indexStatus: DocumentIndexStatus;
  isPublic: boolean;
  uploadedBy: string;
  summary: string | null;
  createdAt: string;
}

/** 백엔드가 내려주는 /uploads/... 상대 경로를 다운로드 링크로 쓸 수 있는 절대 URL로 바꾼다 */
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1').replace(/\/api\/v1\/?$/, '');

export function toAbsoluteFileUrl(fileUrl: string): string {
  return fileUrl.startsWith('http') ? fileUrl : `${API_ORIGIN}${fileUrl}`;
}

export interface DocumentListQuery {
  folderId?: string;
}

export async function listDocuments(query: DocumentListQuery): Promise<AppDocument[]> {
  const { data } = await apiClient.get<ApiSuccess<AppDocument[]>>('/documents', {
    params: { folderId: query.folderId, page: 1, limit: 100 },
  });
  return data.data;
}

export interface UploadDocumentInput {
  title: string;
  category: DocumentCategory;
  folderId?: string;
  file: File;
}

export async function uploadDocument(input: UploadDocumentInput): Promise<AppDocument> {
  const formData = new FormData();
  formData.append('file', input.file);
  formData.append('title', input.title);
  formData.append('category', input.category);
  if (input.folderId) formData.append('folderId', input.folderId);

  const { data } = await apiClient.post<ApiSuccess<AppDocument>>('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function reuploadDocument(documentId: string, file: File): Promise<AppDocument> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<ApiSuccess<AppDocument>>(`/documents/${documentId}/versions`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function deleteDocuments(ids: string[]): Promise<void> {
  await apiClient.post('/documents/bulk-delete', { ids });
}

export async function deleteAllDocuments(): Promise<void> {
  await apiClient.delete('/documents');
}
