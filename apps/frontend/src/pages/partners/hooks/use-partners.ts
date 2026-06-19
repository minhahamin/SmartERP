import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPartner, listPartners, updatePartner, type PartnerInput, type PartnerListQuery } from '@/pages/partners/api/partners-api';
import { toast } from '@/stores/toast-store';

const PARTNERS_KEY = ['partners'] as const;

export function usePartners(query: PartnerListQuery) {
  return useQuery({ queryKey: [...PARTNERS_KEY, query], queryFn: () => listPartners(query) });
}

export function useCreatePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PartnerInput) => createPartner(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARTNERS_KEY });
      toast({ title: '거래처가 등록되었습니다.', variant: 'success' });
    },
  });
}

export function useUpdatePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PartnerInput }) => updatePartner(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARTNERS_KEY });
      toast({ title: '거래처 정보가 수정되었습니다.', variant: 'success' });
    },
  });
}
