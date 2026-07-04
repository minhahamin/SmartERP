import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/config/routes';
import type { LowStockProduct } from '@/pages/dashboard/api/get-dashboard-summary';

function LowStockList({ products }: { products: LowStockProduct[] }) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>재고 경고 목록</CardTitle>
        <Link to={ROUTES.inventory} className="text-xs font-medium text-primary hover:underline">
          더보기 →
        </Link>
      </CardHeader>
      <div className="flex flex-col divide-y divide-border px-5 pb-2">
        {products.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">안전재고 미달 품목이 없습니다.</p>
        ) : (
          products.map((product) => (
            <div key={product.id} className="flex items-center gap-3 py-2.5">
              <AlertTriangle className="size-4 shrink-0 text-warning" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-foreground">{product.name}</span>
                <span className="text-xs text-muted-foreground">{product.warehouseName}</span>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-red-600">
                {product.quantity} <span className="text-muted-foreground">/ {product.safetyStock}</span>
              </span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function LowStockListSkeleton() {
  return <Skeleton className="h-[268px] rounded-md" />;
}

export { LowStockList, LowStockListSkeleton };
