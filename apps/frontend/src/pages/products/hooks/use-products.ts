import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createProduct,
  getProduct,
  listProducts,
  toggleProductActive,
  updateProduct,
  type ProductInput,
  type ProductListQuery,
} from '@/pages/products/api/products-api';
import { toast } from '@/stores/toast-store';

const PRODUCTS_KEY = ['products'] as const;

export function useProducts(query: ProductListQuery) {
  return useQuery({ queryKey: [...PRODUCTS_KEY, 'list', query], queryFn: () => listProducts(query) });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, 'detail', id],
    queryFn: () => getProduct(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProductInput) => createProduct(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
      toast({ title: '제품이 등록되었습니다.', variant: 'success' });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ProductInput> }) => updateProduct(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
      toast({ title: '제품 정보가 수정되었습니다.', variant: 'success' });
    },
  });
}

export function useToggleProductActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => toggleProductActive(id),
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
      toast({ title: product.isActive ? '제품이 다시 활성화되었습니다.' : '제품이 단종 처리되었습니다.', variant: 'success' });
    },
  });
}
