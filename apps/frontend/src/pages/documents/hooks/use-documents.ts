import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listDocuments, uploadDocument, type DocumentListQuery, type UploadDocumentInput } from '@/pages/documents/api/documents-api';
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
