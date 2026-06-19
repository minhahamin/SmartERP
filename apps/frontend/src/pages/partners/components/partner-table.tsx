import { Badge } from '@/components/ui/badge';
import { Tag } from '@/components/ui/tag';
import { getEmployeeById } from '@/mocks/employees';
import type { Partner } from '@/mocks/partners';

const TYPE_LABEL: Record<Partner['type'], string> = { CUSTOMER: '고객사', VENDOR: '공급사', BOTH: '고객/공급' };
const TYPE_VARIANT: Record<Partner['type'], 'info' | 'warning' | 'default'> = { CUSTOMER: 'info', VENDOR: 'warning', BOTH: 'default' };

interface PartnerTableProps {
  partners: Partner[];
  onRowClick: (partner: Partner) => void;
}

function PartnerTable({ partners, onRowClick }: PartnerTableProps) {
  if (partners.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-gray-50 text-left text-xs font-medium text-muted-foreground">
          <th className="px-4 py-2.5">거래처명</th>
          <th className="px-4 py-2.5">유형</th>
          <th className="px-4 py-2.5">담당자</th>
          <th className="px-4 py-2.5">등급</th>
          <th className="px-4 py-2.5">최근 거래일</th>
        </tr>
      </thead>
      <tbody>
        {partners.map((partner) => (
          <tr key={partner.id} className="cursor-pointer border-b border-border last:border-0 hover:bg-gray-50" onClick={() => onRowClick(partner)}>
            <td className="px-4 py-2.5 font-medium text-foreground">{partner.name}</td>
            <td className="px-4 py-2.5">
              <Badge variant={TYPE_VARIANT[partner.type]}>{TYPE_LABEL[partner.type]}</Badge>
            </td>
            <td className="px-4 py-2.5 text-muted-foreground">{getEmployeeById(partner.managerId)?.name ?? '-'}</td>
            <td className="px-4 py-2.5">
              <Tag>{partner.grade}등급</Tag>
            </td>
            <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{partner.lastOrderDate}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export { PartnerTable };
