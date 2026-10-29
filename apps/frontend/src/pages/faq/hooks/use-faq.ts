import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createFaqDraft,
  generateFaqCandidates,
  listPendingFaq,
  listPublishedFaq,
  publishFaq,
  rejectFaq,
  type CreateFaqInput,
} from '@/pages/faq/api/faq-api';
import { toast } from '@/stores/toast-store';

const PUBLISHED_KEY = ['faq', 'published'] as const;
const PENDING_KEY = ['faq', 'pending'] as const;

export function usePublishedFaq() {
  return useQuery({ queryKey: PUBLISHED_KEY, queryFn: listPublishedFaq });
}

export function usePendingFaq() {
  return useQuery({ queryKey: PENDING_KEY, queryFn: listPendingFaq });
}

export function useGenerateFaqCandidates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (threshold?: number) => generateFaqCandidates(threshold),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: PENDING_KEY });
      const skipped = result.skippedNoEvidence > 0 ? ` (근거 문서가 없어 제외한 질문 ${result.skippedNoEvidence}건은 직접 작성해주세요)` : '';
      toast({
        title:
          result.candidatesCreated > 0
            ? `새 FAQ 후보 ${result.candidatesCreated}건을 찾았습니다.${skipped}`
            : result.skippedNoEvidence > 0
              ? `반복 질문 ${result.skippedNoEvidence}건을 찾았지만 답변할 근거(문서)가 없어 후보로 만들지 않았습니다.`
              : `분석 완료 — 임계치를 넘는 반복 질문이 없었습니다. (분석한 질문 ${result.distinctQuestions}종)`,
        variant: result.candidatesCreated > 0 ? 'success' : 'default',
      });
    },
  });
}

export function useCreateFaqDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFaqInput) => createFaqDraft(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PENDING_KEY });
      toast({ title: 'FAQ 초안이 추가되었습니다.', variant: 'success' });
    },
  });
}

export function usePublishFaq() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publishFaq(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PENDING_KEY });
      queryClient.invalidateQueries({ queryKey: PUBLISHED_KEY });
      toast({ title: 'FAQ가 게시되었습니다.', variant: 'success' });
    },
  });
}

export function useRejectFaq() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rejectFaq(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PENDING_KEY });
      toast({ title: 'FAQ 후보를 반려했습니다.', variant: 'default' });
    },
  });
}
