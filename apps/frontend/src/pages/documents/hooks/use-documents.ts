import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteAllDocuments,
  deleteDocuments,
  listDocuments,
  reuploadDocument,
  uploadDocument,
  type DocumentListQuery,
  type ReuploadDocumentInput,
  type UploadDocumentInput,
} from '@/pages/documents/api/documents-api';
import { toast } from '@/stores/toast-store';

const DOCUMENTS_KEY = ['documents'] as const;

export function useDocuments(query: DocumentListQuery) {
  return useQuery({
    queryKey: [...DOCUMENTS_KEY, query],
    queryFn: () => listDocuments(query),
    refetchInterval: (q) => (q.state.data?.some((d) => d.indexStatus === 'PENDING' || d.indexStatus === 'PROCESSING') ? 1000 : false),
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadDocumentInput) => uploadDocument(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
      toast({ title: '문서가 업로드되었습니다. 색인이 진행됩니다.', variant: 'success' });
    },
  });
}

export function useReuploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReuploadDocumentInput }) => reuploadDocument(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
      toast({ title: '새 버전이 업로드되었습니다. 색인이 다시 진행됩니다.', variant: 'success' });
    },
  });
}

export function useDeleteDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteDocuments(ids),
    onSuccess: (_void, ids) => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
      toast({ title: `문서 ${ids.length}건이 삭제되었습니다.`, variant: 'success' });
    },
  });
}

export function useDeleteAllDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteAllDocuments(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
      toast({ title: '전체 문서가 삭제되었습니다.', variant: 'success' });
    },
  });
}
