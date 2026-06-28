import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDepartmentOptions } from '@/pages/employees/hooks/use-employees';
import type { EmployeeStatus } from '@/pages/employees/api/employees-api';

interface EmployeeFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  departmentId: string;
  onDepartmentChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
}

const STATUS_OPTIONS: { value: EmployeeStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '전체 상태' },
  { value: 'ACTIVE', label: '재직중' },
  { value: 'ON_LEAVE', label: '휴직중' },
  { value: 'RESIGNED', label: '퇴사' },
];

function EmployeeFilters({
  search,
  onSearchChange,
  departmentId,
  onDepartmentChange,
  status,
  onStatusChange,
}: EmployeeFiltersProps) {
  const { data: departments } = useDepartmentOptions();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-56">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="이름/사번 검색"
          className="pl-8"
        />
      </div>
      <Select value={departmentId} onValueChange={onDepartmentChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">전체 부서</SelectItem>
          {departments?.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export { EmployeeFilters };
