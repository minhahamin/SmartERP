import { useEffect, useState, type FormEvent } from 'react';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateEmployee } from '@/pages/employees/hooks/use-employees';
import { useAuthStore } from '@/stores/auth-store';
import type { Employee } from '@/mocks/employees';

interface MyProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
}

/**
 * 직원 관리(HR용 EmployeeFormDialog)와 달리 본인이 직접 수정 가능한 항목(연락처/이메일)만 노출한다.
 * 근거: docs/02-users-and-permissions.md — EMPLOYEE는 본인 일부 항목만 수정 가능(R/own, U/own 일부).
 */
function MyProfileEditDialog({ open, onOpenChange, employee }: MyProfileEditDialogProps) {
  const [phone, setPhone] = useState(employee.phone);
  const [email, setEmail] = useState(employee.email);
  const updateEmployee = useUpdateEmployee();
  const patchUser = useAuthStore((state) => state.patchUser);

  useEffect(() => {
    if (open) {
      setPhone(employee.phone);
      setEmail(employee.email);
    }
  }, [open, employee]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    updateEmployee.mutate(
      { id: employee.id, input: { phone, email } },
      {
        onSuccess: () => {
          patchUser({ email });
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>내 정보 수정</DialogTitle>
            <DialogDescription>연락처와 이메일만 본인이 직접 수정할 수 있습니다. 그 외 정보는 인사 담당자에게 문의해주세요.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="my-phone">연락처</Label>
              <Input id="my-phone" required value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="my-email">이메일</Label>
              <Input id="my-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" loading={updateEmployee.isPending}>
              저장
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { MyProfileEditDialog };
