import type { ReactNode } from 'react';
import { Pencil, FileX2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tag } from '@/components/ui/tag';
import { EmptyState } from '@/components/common/empty-state';
import { getEmployeeById } from '@/mocks/employees';
import { getProductById } from '@/mocks/products';
import { getSalesOrdersByPartner, SALES_ORDER_STATUS_LABEL } from '@/mocks/sales-orders';
import type { Partner } from '@/mocks/partners';

interface PartnerDetailDrawerProps {
  partner: Partner | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (partner: Partner) => void;
}

function PartnerDetailDrawer({ partner, onOpenChange, onEdit }: PartnerDetailDrawerProps) {
  if (!partner) return null;
  const orders = getSalesOrdersByPartner(partner.id);

  return (
    <Sheet open={Boolean(partner)} onOpenChange={onOpenChange}>
      <SheetContent className="w-[440px] max-w-full">
        <SheetHeader className="flex-row items-start justify-between">
          <SheetTitle>{partner.name}</SheetTitle>
          <Button variant="secondary" size="sm" onClick={() => onEdit(partner)}>
            <Pencil /> 수정
          </Button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5">
          <Tabs defaultValue="info">
            <TabsList>
              <TabsTrigger value="info">기본정보</TabsTrigger>
              <TabsTrigger value="orders">거래 이력</TabsTrigger>
            </TabsList>
            <TabsContent value="info" className="flex flex-col gap-3 py-4 text-sm">
              <Row label="사업자번호" value={partner.bizRegNo} />
              <Row label="대표자" value={partner.ceoName} />
              <Row label="연락처" value={partner.phone} />
              <Row label="이메일" value={partner.email} />
              <Row label="주소" value={partner.address} />
              <Row label="등급" value={<Tag>{partner.grade}등급</Tag>} />
              <Row label="담당자" value={getEmployeeById(partner.managerId)?.name ?? '-'} />
            </TabsContent>
            <TabsContent value="orders" className="py-4">
              {orders.length === 0 ? (
                <EmptyState icon={FileX2} title="거래 이력이 없습니다" />
              ) : (
                <div className="flex flex-col gap-2">
                  {orders.map((order) => (
                    <div key={order.id} className="rounded-md border border-border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{order.orderNo}</span>
                        <Badge variant={order.status === 'CANCELLED' ? 'danger' : order.status === 'QUOTE' ? 'default' : 'success'}>
                          {SALES_ORDER_STATUS_LABEL[order.status]}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{order.orderDate}</p>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {order.items.map((item) => getProductById(item.productId)?.name).join(', ')}
                      </p>
                      <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">{order.totalAmount.toLocaleString()}원</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export { PartnerDetailDrawer };
