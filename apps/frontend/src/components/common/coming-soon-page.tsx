import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState } from '@/components/common/empty-state';

interface ComingSoonPageProps {
  title: string;
  description?: string;
}

/**
 * 라우터/사이드바 구조를 먼저 완성하기 위한 자리표시 페이지.
 * docs/04-screen-design.md에 정의된 화면은 이후 단계에서 이 컴포넌트를 실제 구현으로 교체한다.
 */
function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={Construction}
        title="화면 준비 중입니다"
        description="해당 모듈은 다음 단계에서 구현됩니다. docs/04-screen-design.md에 화면 명세가 정의되어 있습니다."
      />
    </div>
  );
}

export { ComingSoonPage };
