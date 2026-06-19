import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Pencil, UserX } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { EmployeeStatusBadge } from '@/pages/employees/components/employee-status-badge';
import { DEPARTMENTS } from '@/mocks/departments';
import { ROLE_LABEL } from '@/types/auth';
import type { Employee } from '@/mocks/employees';
import { ROUTES } from '@/config/routes';

function departmentName(departmentId: string) {
  return DEPARTMENTS.find((d) => d.id === departmentId)?.name ?? '-';
}

interface EmployeeTableProps {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onDeactivate: (employee: Employee) => void;
}

function EmployeeTable({ employees, onEdit, onDeactivate }: EmployeeTableProps) {
  const navigate = useNavigate();

  if (employees.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-gray-50 text-left text-xs font-medium text-muted-foreground">
          <th className="px-4 py-2.5">사번</th>
          <th className="px-4 py-2.5">이름</th>
          <th className="px-4 py-2.5">부서</th>
          <th className="px-4 py-2.5">직급</th>
          <th className="px-4 py-2.5">권한</th>
          <th className="px-4 py-2.5">입사일</th>
          <th className="px-4 py-2.5">상태</th>
          <th className="w-10 px-4 py-2.5" />
        </tr>
      </thead>
      <tbody>
        {employees.map((employee) => (
          <tr
            key={employee.id}
            className="cursor-pointer border-b border-border last:border-0 hover:bg-gray-50"
            onClick={() => navigate(ROUTES.employees + `/${employee.id}`)}
          >
            <td className="px-4 py-2.5 font-medium text-foreground">{employee.employeeNo}</td>
            <td className="px-4 py-2.5 text-foreground">{employee.name}</td>
            <td className="px-4 py-2.5 text-muted-foreground">{departmentName(employee.departmentId)}</td>
            <td className="px-4 py-2.5 text-muted-foreground">{employee.position}</td>
            <td className="px-4 py-2.5 text-muted-foreground">{ROLE_LABEL[employee.role]}</td>
            <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{employee.hireDate}</td>
            <td className="px-4 py-2.5">
              <EmployeeStatusBadge status={employee.status} />
            </td>
            <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => onEdit(employee)}>
                    <Pencil /> 정보 수정
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={employee.status === 'RESIGNED'}
                    onSelect={() => onDeactivate(employee)}
                  >
                    <UserX /> 퇴사 처리
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export { EmployeeTable };
