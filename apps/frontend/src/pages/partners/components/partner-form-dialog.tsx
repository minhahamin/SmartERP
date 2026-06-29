import { useEffect, useState, type FormEvent } from 'react';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreatePartner, useUpdatePartner } from '@/pages/partners/hooks/use-partners';
import { useEmployees } from '@/pages/employees/hooks/use-employees';
import type { Partner, PartnerGrade, PartnerType } from '@/pages/partners/api/partners-api';

interface PartnerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner?: Partner;
}

const EMPTY_FORM = {
  name: '',
  bizRegNo: '',
  type: 'CUSTOMER' as PartnerType,
  ceoName: '',
  phone: '',
  email: '',
  address: '',
  grade: 'B' as PartnerGrade,
  managerId: '',
};

function PartnerFormDialog({ open, onOpenChange, partner }: PartnerFormDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const { data: employeeResult } = useEmployees({ status: 'ACTIVE', page: 1, limit: 100 });
  const salesManagers = employeeResult?.items ?? [];
  const defaultManagerId = salesManagers[0]?.id ?? '';
  const createPartner = useCreatePartner();
  const updatePartner = useUpdatePartner();
  const isEdit = Boolean(partner);
  const isSubmitting = createPartner.isPending || updatePartner.isPending;

  useEffect(() => {
    if (!open) return;
    if (partner) {
      setForm({
        name: partner.name,
        bizRegNo: partner.bizRegNo,
        type: partner.type,
        ceoName: partner.ceoName ?? '',
        phone: partner.phone ?? '',
        email: partner.email ?? '',
        address: partner.address ?? '',
        grade: partner.grade,
        managerId: partner.managerId ?? '',
      });
    } else {
      setForm({ ...EMPTY_FORM, managerId: defaultManagerId });
    }
  }, [open, partner, defaultManagerId]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isEdit && partner) {
      updatePartner.mutate({ id: partner.id, input: form }, { onSuccess: () => onOpenChange(false) });
    } else {
      createPartner.mutate(form, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? '거래처 정보 수정' : '거래처 등록'}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="partner-name">거래처명</Label>
                <Input id="partner-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="partner-biz">사업자번호</Label>
                <Input id="partner-biz" required value={form.bizRegNo} onChange={(e) => setForm({ ...form, bizRegNo: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="partner-ceo">대표자</Label>
                <Input id="partner-ceo" required value={form.ceoName} onChange={(e) => setForm({ ...form, ceoName: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>유형</Label>
                <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value as PartnerType })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CUSTOMER">고객사</SelectItem>
                    <SelectItem value="VENDOR">공급사</SelectItem>
                    <SelectItem value="BOTH">고객/공급</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>등급</Label>
                <Select value={form.grade} onValueChange={(value) => setForm({ ...form, grade: value as PartnerGrade })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A등급</SelectItem>
                    <SelectItem value="B">B등급</SelectItem>
                    <SelectItem value="C">C등급</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="partner-phone">연락처</Label>
                <Input id="partner-phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="partner-email">이메일</Label>
                <Input id="partner-email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="partner-address">주소</Label>
                <Input id="partner-address" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>담당자</Label>
                <Select value={form.managerId} onValueChange={(value) => setForm({ ...form, managerId: value })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {salesManagers.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? '저장' : '등록'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { PartnerFormDialog };
