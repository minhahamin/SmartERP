import { useEffect, useState, type FormEvent } from 'react';
import { Copy } from 'lucide-react';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { roleLabel } from '@/types/auth';
import {
  useCreateEmployee,
  useDepartmentOptions,
  useRoleOptions,
  useUpdateEmployee,
} from '@/pages/employees/hooks/use-employees';
import type { Employee } from '@/pages/employees/api/employees-api';
import { toast } from '@/stores/toast-store';

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee;
}

const NO_DEPARTMENT = 'NONE';

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  departmentId: NO_DEPARTMENT,
  roleId: '',
  position: '',
  hireDate: '',
  baseSalary: '',
};

function EmployeeFormDialog({ open, onOpenChange, employee }: EmployeeFormDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const { data: departments } = useDepartmentOptions();
  const { data: roles } = useRoleOptions();
  const isEdit = Boolean(employee);
  const isSubmitting = createEmployee.isPending || updateEmployee.isPending;

  useEffect(() => {
    if (!open) return;
    setTemporaryPassword(null);
    if (employee) {
      setForm({
        name: employee.name,
        email: employee.email,
        phone: employee.phone ?? '',
        departmentId: employee.departmentId ?? NO_DEPARTMENT,
        roleId: employee.roleId,
        position: employee.position ?? '',
        hireDate: employee.hireDate.slice(0, 10),
        baseSalary: employee.baseSalary ?? '',
      });
    } else {
      const defaultRoleId = roles?.find((r) => r.name === 'EMPLOYEE')?.id ?? roles?.[0]?.id ?? '';
      setForm({ ...EMPTY_FORM, roleId: defaultRoleId });
    }
  }, [open, employee, roles]);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) setTemporaryPassword(null);
    onOpenChange(nextOpen);
  };

  const buildInput = () => ({
    name: form.name,
    email: form.email,
    phone: form.phone || undefined,
    departmentId: form.departmentId === NO_DEPARTMENT ? undefined : form.departmentId,
    roleId: form.roleId,
    position: form.position || undefined,
    hireDate: form.hireDate,
    baseSalary: form.baseSalary ? Number(form.baseSalary) : undefined,
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isEdit && employee) {
      updateEmployee.mutate({ id: employee.id, input: buildInput() }, { onSuccess: () => onOpenChange(false) });
    } else {
      createEmployee.mutate(buildInput(), {
        onSuccess: (created) => setTemporaryPassword(created.temporaryPassword),
      });
    }
  };

  const handleCopyPassword = async () => {
    if (!temporaryPassword) return;
    await navigator.clipboard.writeText(temporaryPassword);
    toast({ title: '임시 비밀번호를 복사했습니다.', variant: 'success' });
  };

  if (temporaryPassword) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>직원이 등록되었습니다</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-muted-foreground">
              아래 임시 비밀번호를 직원에게 전달해 주세요. 최초 로그인 시 비밀번호 변경이 강제됩니다.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Input readOnly value={temporaryPassword} className="font-mono" />
              <Button type="button" variant="secondary" size="icon" onClick={() => void handleCopyPassword()}>
                <Copy className="size-4" />
              </Button>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" onClick={() => handleClose(false)}>
              완료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? '직원 정보 수정' : '직원 등록'}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="emp-name">이름</Label>
                <Input id="emp-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="emp-email">이메일</Label>
                <Input
                  id="emp-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp-phone">연락처</Label>
                <Input
                  id="emp-phone"
                  required
                  placeholder="010-0000-0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp-position">직급</Label>
                <Input
                  id="emp-position"
                  required
                  placeholder="사원/대리/팀장 등"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>부서</Label>
                <Select value={form.departmentId} onValueChange={(value) => setForm({ ...form, departmentId: value })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_DEPARTMENT}>부서 없음</SelectItem>
                    {departments?.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>권한(Role)</Label>
                <Select value={form.roleId} onValueChange={(value) => setForm({ ...form, roleId: value })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles?.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {roleLabel(role.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp-hire-date">입사일</Label>
                <Input
                  id="emp-hire-date"
                  type="date"
                  required
                  value={form.hireDate}
                  onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="emp-base-salary">기본급</Label>
                <Input
                  id="emp-base-salary"
                  type="number"
                  min={0}
                  placeholder="3000000"
                  value={form.baseSalary}
                  onChange={(e) => setForm({ ...form, baseSalary: e.target.value })}
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={!form.roleId}>
              {isEdit ? '저장' : '등록'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { EmployeeFormDialog };
