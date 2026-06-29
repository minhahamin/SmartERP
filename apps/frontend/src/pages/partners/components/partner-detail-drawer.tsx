import type { ReactNode } from 'react';
import { Pencil, FileX2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/tag';
import { EmptyState } from '@/components/common/empty-state';
import { useEmployees } from '@/pages/employees/hooks/use-employees';
import type { Partner } from '@/pages/partners/api/partners-api';

interface PartnerDetailDrawerProps {
  partner: Partner | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (partner: Partner) => void;
}

function PartnerDetailDrawer({ partner, onOpenChange, onEdit }: PartnerDetailDrawerProps) {
  const { data: employees } = useEmployees({ status: 'ACTIVE', page: 1, limit: 100 });
  if (!partner) return null;
  const managerName = employees?.items.find((e) => e.id === partner.managerId)?.name ?? '-';

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
              <Row label="대표자" value={partner.ceoName ?? '-'} />
              <Row label="연락처" value={partner.phone ?? '-'} />
              <Row label="이메일" value={partner.email ?? '-'} />
              <Row label="주소" value={partner.address ?? '-'} />
              <Row label="등급" value={<Tag>{partner.grade}등급</Tag>} />
              <Row label="담당자" value={managerName} />
            </TabsContent>
            <TabsContent value="orders" className="py-4">
              {/* 영업주문(SalesOrder) 모듈이 아직 연결되지 않아 거래 이력은 표시할 수 없다 */}
              <EmptyState icon={FileX2} title="거래 이력이 없습니다" />
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
