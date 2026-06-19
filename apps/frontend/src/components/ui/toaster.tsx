import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useToastStore } from '@/stores/toast-store';
import { cn } from '@/lib/utils';

const ICONS = {
  default: Info,
  success: CheckCircle2,
  destructive: AlertCircle,
};

function Toaster() {
  const { toasts, dismiss } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex w-80 flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.variant];
        return (
          <div
            key={t.id}
            role="status"
            className={cn(
              'animate-in slide-in-from-top-2 fade-in-0 flex items-start gap-2.5 rounded-md border bg-white p-3 text-sm shadow-md',
              t.variant === 'success' && 'border-success/30',
              t.variant === 'destructive' && 'border-destructive/30',
              t.variant === 'default' && 'border-border',
            )}
          >
            <Icon
              className={cn(
                'mt-0.5 size-4 shrink-0',
                t.variant === 'success' && 'text-success',
                t.variant === 'destructive' && 'text-destructive',
                t.variant === 'default' && 'text-info',
              )}
            />
            <div className="flex-1">
              <p className="font-medium text-foreground">{t.title}</p>
              {t.description && <p className="mt-0.5 text-muted-foreground">{t.description}</p>}
            </div>
            <button type="button" onClick={() => dismiss(t.id)} className="text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export { Toaster };
