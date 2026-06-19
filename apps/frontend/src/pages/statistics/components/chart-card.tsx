import type { ReactNode } from 'react';
import { Download } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { downloadCsv } from '@/lib/csv';
import type { ChartPoint } from '@/pages/statistics/api/statistics-api';

interface ChartCardProps {
  title: string;
  data: ChartPoint[];
  filename: string;
  children: ReactNode;
}

function ChartCard({ title, data, filename, children }: ChartCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => downloadCsv(filename, data.map((d) => ({ 항목: d.label, 값: d.value })))}
        >
          <Download className="size-3.5" /> CSV
        </Button>
      </CardHeader>
      <div className="h-64 px-2 pb-4">{children}</div>
    </Card>
  );
}

export { ChartCard };
