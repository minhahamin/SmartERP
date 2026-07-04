import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useEmployees } from '@/pages/employees/hooks/use-employees';
import { useDocumentFolders } from '@/pages/documents/hooks/use-folders';
import type { AppDocument } from '@/pages/documents/api/documents-api';

const INDEX_STATUS_CONFIG: Record<AppDocument['indexStatus'], { label: string; variant: 'default' | 'info' | 'success' | 'danger' }> = {
  PENDING: { label: '색인 대기', variant: 'default' },
  PROCESSING: { label: '색인 중', variant: 'info' },
  DONE: { label: '색인 완료', variant: 'success' },
  FAILED: { label: '색인 실패', variant: 'danger' },
};

interface DocumentTableProps {
  documents: AppDocument[];
  onRowClick: (document: AppDocument) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
}

function DocumentTable({ documents, onRowClick, selectedIds, onToggleSelect, onToggleSelectAll }: DocumentTableProps) {
  const { data: folders } = useDocumentFolders();
  const { data: employees } = useEmployees({ status: 'ACTIVE', page: 1, limit: 100 });
  const folderName = (folderId: string | null) => folders?.find((f) => f.id === folderId)?.name ?? '-';
  const employeeName = (id: string) => employees?.items.find((e) => e.id === id)?.name ?? '-';

  if (documents.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">문서가 없습니다.</p>;
  }

  const allSelected = documents.length > 0 && documents.every((d) => selectedIds.has(d.id));

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-gray-50 text-left text-xs font-medium text-muted-foreground">
          <th className="w-10 px-4 py-2.5">
            <Checkbox checked={allSelected} onCheckedChange={onToggleSelectAll} />
          </th>
          <th className="px-4 py-2.5">제목</th>
          <th className="px-4 py-2.5">폴더</th>
          <th className="px-4 py-2.5">버전</th>
          <th className="px-4 py-2.5">업로드자</th>
          <th className="px-4 py-2.5">업로드일</th>
          <th className="px-4 py-2.5">색인 상태</th>
        </tr>
      </thead>
      <tbody>
        {documents.map((doc) => {
          const indexStatus = INDEX_STATUS_CONFIG[doc.indexStatus];
          const checked = selectedIds.has(doc.id);
          return (
            <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-gray-50">
              <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                <Checkbox checked={checked} onCheckedChange={() => onToggleSelect(doc.id)} />
              </td>
              <td className="cursor-pointer px-4 py-2.5" onClick={() => onRowClick(doc)}>
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <FileText className="size-4 text-muted-foreground" />
                  {doc.title}
                </span>
              </td>
              <td className="cursor-pointer px-4 py-2.5 text-muted-foreground" onClick={() => onRowClick(doc)}>
                {folderName(doc.folderId)}
              </td>
              <td className="cursor-pointer px-4 py-2.5 text-muted-foreground" onClick={() => onRowClick(doc)}>
                v{doc.version}
              </td>
              <td className="cursor-pointer px-4 py-2.5 text-muted-foreground" onClick={() => onRowClick(doc)}>
                {employeeName(doc.uploadedBy)}
              </td>
              <td className="cursor-pointer px-4 py-2.5 tabular-nums text-muted-foreground" onClick={() => onRowClick(doc)}>
                {doc.createdAt.slice(0, 10)}
              </td>
              <td className="cursor-pointer px-4 py-2.5" onClick={() => onRowClick(doc)}>
                <Badge variant={indexStatus.variant} dot={doc.indexStatus === 'PROCESSING'}>
                  {indexStatus.label}
                </Badge>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export { DocumentTable };
