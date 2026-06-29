import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PartnerTable } from '@/pages/partners/components/partner-table';
import { PartnerFormDialog } from '@/pages/partners/components/partner-form-dialog';
import { PartnerDetailDrawer } from '@/pages/partners/components/partner-detail-drawer';
import { usePartners } from '@/pages/partners/hooks/use-partners';
import type { Partner, PartnerType } from '@/pages/partners/api/partners-api';

function PartnersPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('ALL');
  const { data: partners, isLoading } = usePartners({
    search: search || undefined,
    type: type === 'ALL' ? undefined : (type as PartnerType),
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | undefined>(undefined);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="거래처 관리" description="고객사/공급사 마스터 정보와 거래 이력을 관리합니다." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="거래처명 검색" className="pl-8" />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">전체 유형</SelectItem>
              <SelectItem value="CUSTOMER">고객사</SelectItem>
              <SelectItem value="VENDOR">공급사</SelectItem>
              <SelectItem value="BOTH">고객/공급</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => {
            setEditingPartner(undefined);
            setFormOpen(true);
          }}
        >
          <Plus /> 거래처 등록
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading || !partners ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : (
          <PartnerTable partners={partners} onRowClick={setSelectedPartner} />
        )}
      </Card>

      <PartnerFormDialog open={formOpen} onOpenChange={setFormOpen} partner={editingPartner} />

      <PartnerDetailDrawer
        partner={selectedPartner}
        onOpenChange={(open) => !open && setSelectedPartner(null)}
        onEdit={(partner) => {
          setSelectedPartner(null);
          setEditingPartner(partner);
          setFormOpen(true);
        }}
      />
    </div>
  );
}

export { PartnersPage };
