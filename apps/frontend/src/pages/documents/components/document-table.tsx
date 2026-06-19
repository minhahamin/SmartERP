import { FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getEmployeeById } from '@/mocks/employees';
import { CATEGORY_LABEL, type AppDocument } from '@/mocks/documents';

const INDEX_STATUS_CONFIG: Record<AppDocument['indexStatus'], { label: string; variant: 'default' | 'info' | 'success' | 'danger' }> = {
  PENDING: { label: '색인 대기', variant: 'default' },
  PROCESSING: { label: '색인 중', variant: 'info' },
  DONE: { label: '색인 완료', variant: 'success' },
  FAILED: { label: '색인 실패', variant: 'danger' },
};

interface DocumentTableProps {
  documents: AppDocument[];
  onRowClick: (document: AppDocument) => void;
}

function DocumentTable({ documents, onRowClick }: DocumentTableProps) {
  if (documents.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">문서가 없습니다.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-gray-50 text-left text-xs font-medium text-muted-foreground">
          <th className="px-4 py-2.5">제목</th>
          <th className="px-4 py-2.5">카테고리</th>
          <th className="px-4 py-2.5">버전</th>
          <th className="px-4 py-2.5">업로드자</th>
          <th className="px-4 py-2.5">업로드일</th>
          <th className="px-4 py-2.5">색인 상태</th>
        </tr>
      </thead>
      <tbody>
        {documents.map((doc) => {
          const indexStatus = INDEX_STATUS_CONFIG[doc.indexStatus];
          return (
            <tr key={doc.id} className="cursor-pointer border-b border-border last:border-0 hover:bg-gray-50" onClick={() => onRowClick(doc)}>
              <td className="px-4 py-2.5">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <FileText className="size-4 text-muted-foreground" />
                  {doc.title}
                </span>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{CATEGORY_LABEL[doc.category]}</td>
              <td className="px-4 py-2.5 text-muted-foreground">v{doc.version}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{getEmployeeById(doc.uploadedBy)?.name ?? '-'}</td>
              <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{doc.createdAt}</td>
              <td className="px-4 py-2.5">
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
