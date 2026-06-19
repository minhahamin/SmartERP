import { Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState } from '@/components/common/empty-state';

function AiAssistantPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="AI 업무 도우미" description="자연어로 ERP 데이터를 조회하거나 사내 문서를 검색합니다." />
      <EmptyState
        icon={Sparkles}
        title="AI 챗봇 화면 준비 중입니다"
        description="Function Calling 기반 ERP 데이터 조회와 RAG 기반 문서 검색은 docs/09, docs/10에 정의되어 있으며, 다음 단계에서 구현됩니다."
      />
    </div>
  );
}

export { AiAssistantPage };
