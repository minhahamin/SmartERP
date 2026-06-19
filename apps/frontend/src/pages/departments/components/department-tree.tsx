import { Building2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Department } from '@/mocks/departments';

interface DepartmentTreeProps {
  departments: Department[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function DepartmentTree({ departments, selectedId, onSelect }: DepartmentTreeProps) {
  const roots = departments.filter((d) => d.parentId === null);

  return (
    <div className="flex flex-col gap-0.5">
      {roots.map((root) => (
        <TreeNode key={root.id} department={root} departments={departments} selectedId={selectedId} onSelect={onSelect} depth={0} />
      ))}
    </div>
  );
}

function TreeNode({
  department,
  departments,
  selectedId,
  onSelect,
  depth,
}: {
  department: Department;
  departments: Department[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  depth: number;
}) {
  const children = departments.filter((d) => d.parentId === department.id);

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(department.id)}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        className={cn(
          'flex w-full items-center gap-1.5 rounded-md py-1.5 pr-2 text-left text-sm transition-colors',
          selectedId === department.id ? 'bg-primary-soft font-medium text-primary-soft-foreground' : 'text-foreground hover:bg-secondary',
        )}
      >
        {children.length > 0 ? <ChevronRight className="size-3.5 text-muted-foreground" /> : <span className="w-3.5" />}
        <Building2 className="size-3.5 text-muted-foreground" />
        {department.name}
      </button>
      {children.map((child) => (
        <TreeNode key={child.id} department={child} departments={departments} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
}

export { DepartmentTree };
