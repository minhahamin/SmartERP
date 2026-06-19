import { Link } from 'react-router-dom';
import { FileText, ShieldAlert, Table2 } from 'lucide-react';
import type { CitationCardData, TableCardData } from '@/pages/ai-assistant/api/types';

function DataTableCard({ data }: { data: TableCardData }) {
  return (
    <div className="mt-2 overflow-hidden rounded-md border border-border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 text-left text-muted-foreground">
              {data.columns.map((col) => (
                <th key={col} className="px-3 py-2 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, idx) => (
              <tr key={idx} className="border-t border-border">
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-3 py-2 text-foreground">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border bg-gray-50 px-3 py-1.5 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Table2 className="size-3" /> 조회 조건: {data.conditionText}
        </span>
        {data.linkTo && (
          <Link to={data.linkTo} className="font-medium text-primary hover:underline">
            {data.linkLabel ?? '자세히 보기'} →
          </Link>
        )}
      </div>
    </div>
  );
}

function CitationCard({ citation }: { citation: CitationCardData }) {
  return (
    <div className="mt-2 flex items-start gap-2 rounded-md border border-border bg-gray-50 px-3 py-2 text-xs text-muted-foreground">
      <FileText className="mt-0.5 size-3.5 shrink-0" />
      <span>
        참고 문서: <span className="font-medium text-foreground">{citation.documentTitle}</span>
        {citation.page && ` (${citation.page})`}
      </span>
    </div>
  );
}

function DeniedNotice() {
  return (
    <div className="mt-2 flex items-center gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2 text-xs text-warning-foreground">
      <ShieldAlert className="size-3.5 shrink-0" />
      RBAC 정책에 따라 차단된 요청입니다.
    </div>
  );
}

export { DataTableCard, CitationCard, DeniedNotice };
