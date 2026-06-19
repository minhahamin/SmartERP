import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * 속성/메타데이터 라벨(거래처 등급, 제품 분류 등)에 사용하는 중립 톤 Tag.
 * 상태/판정 결과에는 Badge(components/ui/badge.tsx)를 사용한다.
 */
function Tag({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="tag"
      className={cn(
        'inline-flex w-fit shrink-0 items-center rounded-sm border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { Tag };
