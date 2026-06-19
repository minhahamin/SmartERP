import { useState } from 'react';
import { LayoutGrid, List, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ProductTable } from '@/pages/products/components/product-table';
import { ProductCardGrid } from '@/pages/products/components/product-card-grid';
import { ProductFormDialog } from '@/pages/products/components/product-form-dialog';
import { useProducts } from '@/pages/products/hooks/use-products';

function ProductsPage() {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'table' | 'card'>('table');
  const [formOpen, setFormOpen] = useState(false);
  const { data: products, isLoading } = useProducts({ search: search || undefined });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="제품 관리" description="판매/생산 대상 품목 마스터와 안전재고 기준을 관리합니다." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="제품명/SKU 검색" className="pl-8" />
          </div>
          <div className="flex items-center rounded-md border border-border p-0.5">
            <button
              type="button"
              onClick={() => setView('table')}
              className={cn('flex size-7 items-center justify-center rounded-sm', view === 'table' ? 'bg-secondary' : 'text-muted-foreground')}
            >
              <List className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setView('card')}
              className={cn('flex size-7 items-center justify-center rounded-sm', view === 'card' ? 'bg-secondary' : 'text-muted-foreground')}
            >
              <LayoutGrid className="size-4" />
            </button>
          </div>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus /> 제품 등록
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading || !products ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : view === 'table' ? (
          <ProductTable products={products} />
        ) : (
          <ProductCardGrid products={products} />
        )}
      </Card>

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}

export { ProductsPage };
