import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * 상태/판정 결과를 나타내는 Badge. 메타데이터 라벨은 Tag(components/ui/tag.tsx)를 사용한다.
 * 색상 매핑은 docs/05-design-system.md 5.6 Badge 규칙을 따른다.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] font-medium leading-4 tracking-wide w-fit shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-600',
        primary: 'bg-primary-soft text-primary-soft-foreground',
        info: 'bg-info-soft text-info-foreground',
        success: 'bg-success-soft text-success-foreground',
        warning: 'bg-warning-soft text-warning-foreground',
        danger: 'bg-red-100 text-red-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot = false, children, ...props }: BadgeProps) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
