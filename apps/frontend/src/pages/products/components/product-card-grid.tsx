import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tag } from '@/components/ui/tag';
import { getTotalStock } from '@/pages/products/components/product-helpers';
import { useInventoryRows } from '@/pages/products/hooks/use-products';
import { ROUTES } from '@/config/routes';
import { toAbsoluteImageUrl, type Product } from '@/pages/products/api/products-api';

function ProductCardGrid({ products }: { products: Product[] }) {
  const navigate = useNavigate();
  const { data: inventoryRows } = useInventoryRows();

  if (products.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => {
        const stock = getTotalStock(inventoryRows, product.id);
        const low = stock < product.safetyStock;
        return (
          <Card
            key={product.id}
            className="cursor-pointer p-4 transition-shadow hover:shadow-md"
            onClick={() => navigate(`${ROUTES.products}/${product.id}`)}
          >
            <div className="flex h-24 items-center justify-center overflow-hidden rounded-md bg-gray-50 text-muted-foreground">
              {product.imageUrl ? (
                <img src={toAbsoluteImageUrl(product.imageUrl)} alt={product.name} className="size-full object-cover" />
              ) : (
                <Package className="size-8" />
              )}
            </div>
            <p className="mt-3 truncate text-sm font-medium text-foreground">{product.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>
            <div className="mt-2 flex items-center justify-between">
              <Tag>{product.category ?? '-'}</Tag>
              <Badge variant={product.isActive ? 'success' : 'default'}>{product.isActive ? '활성' : '단종'}</Badge>
            </div>
            <p className={`mt-2 text-xs ${low ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>재고 {stock}{product.unit}</p>
          </Card>
        );
      })}
    </div>
  );
}

export { ProductCardGrid };
