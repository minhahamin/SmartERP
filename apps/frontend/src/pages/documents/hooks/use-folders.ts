import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDocumentFolder,
  listDocumentFolders,
  removeDocumentFolder,
  updateDocumentFolder,
} from '@/pages/documents/api/folder-api';
import type { DocumentFolderInput } from '@/mocks/document-folder-store';
import { toast } from '@/stores/toast-store';

const FOLDERS_KEY = ['document-folders'] as const;

export function useDocumentFolders() {
  return useQuery({ queryKey: FOLDERS_KEY, queryFn: listDocumentFolders });
}

export function useCreateDocumentFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DocumentFolderInput) => createDocumentFolder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOLDERS_KEY });
      toast({ title: '폴더가 추가되었습니다.', variant: 'success' });
    },
  });
}

export function useUpdateDocumentFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DocumentFolderInput }) => updateDocumentFolder(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOLDERS_KEY });
      toast({ title: '폴더명이 수정되었습니다.', variant: 'success' });
    },
  });
}

export function useDeleteDocumentFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeDocumentFolder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOLDERS_KEY });
      toast({ title: '폴더가 삭제되었습니다.', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: 'destructive' });
    },
  });
}
