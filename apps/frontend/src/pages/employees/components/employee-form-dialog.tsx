import { useEffect, useState, type FormEvent } from 'react';
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
import { DEPARTMENTS } from '@/mocks/departments';
import { ROLE_LABEL, type RoleName } from '@/types/auth';
import { useCreateEmployee, useUpdateEmployee } from '@/pages/employees/hooks/use-employees';
import type { Employee } from '@/mocks/employees';

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee;
}

const ROLE_OPTIONS = Object.keys(ROLE_LABEL) as RoleName[];

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  departmentId: DEPARTMENTS[0].id,
  role: 'EMPLOYEE' as RoleName,
  position: '',
  hireDate: '',
};

function EmployeeFormDialog({ open, onOpenChange, employee }: EmployeeFormDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const isEdit = Boolean(employee);
  const isSubmitting = createEmployee.isPending || updateEmployee.isPending;

  useEffect(() => {
    if (open) {
      setForm(
        employee
          ? {
              name: employee.name,
              email: employee.email,
              phone: employee.phone,
              departmentId: employee.departmentId,
              role: employee.role,
              position: employee.position,
              hireDate: employee.hireDate,
            }
          : EMPTY_FORM,
      );
    }
  }, [open, employee]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isEdit && employee) {
      updateEmployee.mutate({ id: employee.id, input: form }, { onSuccess: () => onOpenChange(false) });
    } else {
      createEmployee.mutate(form, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>권한(Role)</Label>
                <Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value as RoleName })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABEL[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="emp-hire-date">입사일</Label>
                <Input
                  id="emp-hire-date"
                  type="date"
                  required
                  value={form.hireDate}
                  onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
                />
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

export { EmployeeFormDialog };
