import { Checkbox } from '@/components/ui/checkbox';
import { PERMISSION_ACTIONS, PERMISSION_MODULES, type PermissionAction } from '@/mocks/permissions';

interface PermissionMatrixTableProps {
  matrix: Record<string, PermissionAction[]>;
  onToggle: (moduleKey: string, action: PermissionAction) => void;
  disabled?: boolean;
}

function PermissionMatrixTable({ matrix, onToggle, disabled = false }: PermissionMatrixTableProps) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-gray-50 text-left text-xs font-medium text-muted-foreground">
          <th className="px-4 py-2.5">모듈</th>
          {PERMISSION_ACTIONS.map((action) => (
            <th key={action.key} className="w-14 px-2 py-2.5 text-center">
              {action.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {PERMISSION_MODULES.map((module) => (
          <tr key={module.key} className="border-b border-border last:border-0">
            <td className="px-4 py-2.5 font-medium text-foreground">{module.label}</td>
            {PERMISSION_ACTIONS.map((action) => (
              <td key={action.key} className="px-2 py-2.5 text-center">
                <Checkbox
                  disabled={disabled}
                  checked={matrix[module.key]?.includes(action.key) ?? false}
                  onCheckedChange={() => onToggle(module.key, action.key)}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export { PermissionMatrixTable };
