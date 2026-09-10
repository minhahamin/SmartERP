import { create } from 'zustand';

export type ToastVariant = 'default' | 'success' | 'destructive';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: string) => void;
}

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (item) => {
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    set((state) => ({ toasts: [...state.toasts, { ...item, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3200);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/** 어디서든 `toast({ title, variant })` 또는 `toast("문구")` 형태로 호출하는 전역 헬퍼 */
function toast(input: string | (Omit<ToastItem, 'id'> & { title: string })) {
  if (typeof input === 'string') {
    useToastStore.getState().push({ title: input, variant: 'default' });
  } else {
    useToastStore.getState().push(input);
  }
}

export { useToastStore, toast };
export type { ToastItem };
