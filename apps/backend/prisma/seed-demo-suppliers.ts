// 제품의 기본 공급처(Product.supplierId)를 채우는 데모 시드. 발주 초안 자동 생성이 공급처별로 묶이려면 필요하다.
// supplierId 컬럼은 발주 기능과 함께 추가돼서, 그 전에 만들어진 제품은 값이 비어 있다.
// 이미 공급처가 있는 제품은 건드리지 않으므로 여러 번 실행해도 결과가 같다(멱등).
//
//   npm run prisma:seed-demo-suppliers
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const COMPANY_BIZ_REG_NO = '123-45-67890';

/** 제품 분류 → 공급처(seed-demo-data.ts의 VENDOR 거래처 이름) */
export const SUPPLIER_BY_CATEGORY: Record<string, string> = {
  전자부품: '대성물산',
  산업자재: '동해상사',
  포장재: '그린패키징',
  소모품: '그린패키징',
};

async function main() {
  const company = await prisma.company.findUnique({ where: { bizRegNo: COMPANY_BIZ_REG_NO } });
  if (!company) {
    console.log('데모 회사가 없어 건너뜀');
    return;
  }

  const vendors = await prisma.partner.findMany({
    where: { companyId: company.id, type: { in: ['VENDOR', 'BOTH'] } },
    select: { id: true, name: true },
  });
  const vendorByName = new Map(vendors.map((v) => [v.name, v.id]));

  const products = await prisma.product.findMany({
    where: { companyId: company.id, supplierId: null },
    select: { id: true, category: true },
  });

  let assigned = 0;
  for (const product of products) {
    const vendorId = vendorByName.get(SUPPLIER_BY_CATEGORY[product.category ?? ''] ?? '');
    if (!vendorId) continue;
    await prisma.product.update({ where: { id: product.id }, data: { supplierId: vendorId } });
    assigned += 1;
  }
  console.log(`[suppliers] 공급처 지정 ${assigned}건 (대상 ${products.length}건)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
