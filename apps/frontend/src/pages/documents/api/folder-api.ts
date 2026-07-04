import { apiClient, type ApiSuccess } from '@/lib/api/client';

export interface DocumentFolder {
  id: string;
  name: string;
}

export interface DocumentFolderInput {
  name: string;
}

export async function listDocumentFolders(): Promise<DocumentFolder[]> {
  const { data } = await apiClient.get<ApiSuccess<DocumentFolder[]>>('/document-folders');
  return data.data;
}

export async function createDocumentFolder(input: DocumentFolderInput): Promise<DocumentFolder> {
  const { data } = await apiClient.post<ApiSuccess<DocumentFolder>>('/document-folders', input);
  return data.data;
}

export async function updateDocumentFolder(id: string, input: DocumentFolderInput): Promise<DocumentFolder> {
  const { data } = await apiClient.patch<ApiSuccess<DocumentFolder>>(`/document-folders/${id}`, input);
  return data.data;
}

export async function removeDocumentFolder(id: string): Promise<void> {
  await apiClient.delete(`/document-folders/${id}`);
}
