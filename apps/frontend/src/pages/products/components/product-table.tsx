import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Tag } from '@/components/ui/tag';
import { getTotalStock } from '@/pages/products/components/product-helpers';
import { ROUTES } from '@/config/routes';
import type { Product } from '@/mocks/products';

function ProductTable({ products }: { products: Product[] }) {
  const navigate = useNavigate();

  if (products.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-gray-50 text-left text-xs font-medium text-muted-foreground">
          <th className="px-4 py-2.5">SKU</th>
          <th className="px-4 py-2.5">제품명</th>
          <th className="px-4 py-2.5">분류</th>
          <th className="px-4 py-2.5 text-right">판매가</th>
          <th className="px-4 py-2.5 text-right">총 재고</th>
          <th className="px-4 py-2.5">상태</th>
        </tr>
      </thead>
      <tbody>
        {products.map((product) => {
          const stock = getTotalStock(product.id);
          const low = stock < product.safetyStock;
          return (
            <tr
              key={product.id}
              className="cursor-pointer border-b border-border last:border-0 hover:bg-gray-50"
              onClick={() => navigate(`${ROUTES.products}/${product.id}`)}
            >
              <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{product.sku}</td>
              <td className="px-4 py-2.5 font-medium text-foreground">{product.name}</td>
              <td className="px-4 py-2.5">
                <Tag>{product.category}</Tag>
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{product.salePrice.toLocaleString()}</td>
              <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${low ? 'text-red-600' : 'text-foreground'}`}>{stock}</td>
              <td className="px-4 py-2.5">
                <Badge variant={product.isActive ? 'success' : 'default'}>{product.isActive ? '활성' : '단종'}</Badge>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export { ProductTable };
