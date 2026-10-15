// seed-demo-data.ts가 만든 문서 7건은 존재하지 않는 placeholder 파일(seed-placeholder-N.pdf)을 가리키고
// 요약도 색인도 없어서, 목록에는 보이지만 미리보기가 깨지고 AI 문서 검색도 아무것도 찾지 못한다.
// 이 스크립트는 문서마다 실제 한글 PDF를 만들고 요약과 "색인 완료" 상태를 채운다. 여러 번 실행해도 안전하다(멱등).
//
//   npm run prisma:seed-demo-docs      (apps/backend에서 실행)
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { createKoreanPdfDoc, pdfDocToBuffer } from '../src/common/utils/korean-pdf';

const prisma = new PrismaClient();

interface DemoDocument {
  slug: string;
  summary: string;
  sections: { heading: string; lines: string[] }[];
}

/** 제목으로 시드 문서를 찾아 내용을 채운다 */
const DEMO_DOCUMENTS: Record<string, DemoDocument> = {
  '2026년 취업규칙': {
    slug: 'work-rules-2026',
    summary:
      '2026년 취업규칙은 소정근로시간(09:00~18:00, 휴게 1시간, 주 40시간), 급여 지급일(매월 25일), 수습기간(3개월), 징계 종류, 정년(만 60세)과 퇴직 후 비밀유지 의무를 정리한 문서입니다.',
    sections: [
      { heading: '제1장 근로시간', lines: ['소정근로시간은 09:00부터 18:00까지이며 12:00~13:00은 휴게시간이다.', '주 소정근로시간은 40시간을 원칙으로 한다.', '연장·야간·휴일 근로는 사전 승인 후 가산수당을 지급한다.'] },
      { heading: '제2장 임금', lines: ['급여는 매월 25일에 지급하며 휴일인 경우 전 영업일에 지급한다.', '급여 명세서는 ERPilot 급여 관리 화면에서 본인이 확인할 수 있다.'] },
      { heading: '제3장 채용과 징계', lines: ['신규 입사자의 수습기간은 3개월이다.', '징계는 견책, 감봉, 정직, 해고로 구분하며 징계위원회의 심의를 거친다.', '정년은 만 60세이다.'] },
      { heading: '제4장 보안', lines: ['직원은 재직 중은 물론 퇴직 후에도 업무상 알게 된 영업비밀을 누설하지 않는다.'] },
    ],
  },
  '연차 및 휴가 운영 지침': {
    slug: 'leave-policy',
    summary:
      '연차 및 휴가 운영 지침은 연차 발생 기준(1년 미만 월 1일, 1년 이상 연 15일, 3년차부터 2년마다 1일 가산 최대 25일), 반차·시간 단위 사용, 신청 방법(ERPilot 또는 AI 어시스턴트), 병가·경조사 휴가 기준을 안내합니다.',
    sections: [
      { heading: '1. 연차 발생', lines: ['입사 1년 미만 직원은 개근한 달마다 1일의 연차가 발생한다.', '입사 1년 이상 직원은 연 15일의 연차가 발생하며, 3년차부터 2년마다 1일씩 가산해 최대 25일까지 부여한다.'] },
      { heading: '2. 사용 단위', lines: ['연차는 1일 단위 외에 오전 반차, 오후 반차, 시간 단위(최소 1시간)로 나누어 사용할 수 있다.', '시간 단위 사용은 8시간을 1일로 환산해 차감한다.'] },
      { heading: '3. 신청 방법', lines: ['ERPilot 휴가 신청 화면에서 신청하거나, AI 어시스턴트에게 "다음 주 월요일 연차 신청해줘"처럼 요청하면 초안이 만들어진다.', 'AI가 만든 초안은 본인이 확인 카드에서 "확인하고 진행"을 눌러야 접수된다.', '승인권자(인사 담당자)가 승인하면 일정에 휴가가 반영된다.'] },
      { heading: '4. 병가와 경조사', lines: ['병가는 연 최대 10일까지 사용할 수 있으며 3일 이상은 진단서를 제출한다.', '경조사 휴가: 본인 결혼 5일, 자녀 결혼 1일, 배우자·부모·자녀 사망 5일.'] },
    ],
  },
  '한빛전자 납품 계약서': {
    slug: 'hanbit-supply-contract',
    summary:
      '한빛전자 납품 계약서는 ERPilot 제조사가 (주)한빛전자에 산업용 커넥터와 PCB 기판을 월 단위로 납품하는 조건(단가, 납기, 검수, 대금 지급 30일, 계약기간 1년)을 정한 비공개 계약서입니다.',
    sections: [
      { heading: '제1조 (목적)', lines: ['본 계약은 갑(주식회사 한빛전자)이 을(ERPilot)로부터 산업용 커넥터 및 PCB 기판을 납품받는 조건을 정한다.'] },
      { heading: '제2조 (납품과 검수)', lines: ['을은 갑이 발주한 수량을 발주일로부터 14일 이내에 납품한다.', '갑은 납품일로부터 5영업일 이내에 검수하며 불합격 물량은 교체한다.'] },
      { heading: '제3조 (대금)', lines: ['대금은 검수 완료 후 세금계산서 발행일로부터 30일 이내에 지급한다.', '단가는 별첨 단가표에 따르며 분기별로 협의해 조정할 수 있다.'] },
      { heading: '제4조 (기간)', lines: ['계약기간은 2026년 1월 1일부터 12월 31일까지 1년이며 만료 30일 전까지 이의가 없으면 자동 연장된다.'] },
    ],
  },
  '그린패키징 원자재 공급 계약서': {
    slug: 'greenpackaging-supply-contract',
    summary:
      '그린패키징 원자재 공급 계약서는 그린패키징이 골판지 포장 박스와 완충 에어캡 등 포장 원자재를 정기 공급하는 조건(최소 발주량, 공급 리드타임 7일, 품질 보증, 월말 마감 익월 말 결제)을 정한 비공개 계약서입니다.',
    sections: [
      { heading: '제1조 (공급 품목)', lines: ['공급사(그린패키징)는 골판지 포장 박스(대·소), 완충 에어캡, 절연 테이프 등 포장 원자재를 공급한다.'] },
      { heading: '제2조 (발주와 납기)', lines: ['발주 후 공급 리드타임은 7일 이내로 하며 품목별 최소 발주량은 별첨 표와 같다.'] },
      { heading: '제3조 (품질)', lines: ['공급사는 납품 후 6개월 동안 품질을 보증하며 불량품은 무상으로 교환한다.'] },
      { heading: '제4조 (결제)', lines: ['대금은 월말 마감 후 익월 말일에 지급한다.'] },
    ],
  },
  '2026년 2분기 매출 보고서': {
    slug: 'sales-report-2026-q2',
    summary:
      '2026년 2분기 매출 보고서는 4~6월 매출 추이, 거래처별 비중(상위 청우테크·한빛전자), 제품별 판매 동향과 3분기 영업 과제(신규 거래처 발굴, 안전재고 확보)를 요약합니다.',
    sections: [
      { heading: '1. 매출 요약', lines: ['2분기 매출은 4월을 저점으로 5~6월에 회복세를 보였다.', '상위 거래처는 청우테크와 (주)한빛전자이며 두 곳이 전체 매출의 절반 이상을 차지한다.'] },
      { heading: '2. 제품 동향', lines: ['산업용 커넥터와 PCB 기판이 매출을 견인했고 포장재는 소폭 증가했다.'] },
      { heading: '3. 3분기 과제', lines: ['신규 거래처 발굴, 안전재고 미달 품목(커넥터, 배터리 팩) 선확보, 지연 생산 오더 정상화.'] },
    ],
  },
  '생산라인 품질 점검 보고서': {
    slug: 'production-quality-report',
    summary:
      '생산라인 품질 점검 보고서는 1~3라인의 불량률, 주요 불량 원인(납땜, 치수 공차)과 개선 조치, 정기 점검 일정을 정리한 문서입니다.',
    sections: [
      { heading: '1. 점검 결과', lines: ['1라인 불량률 0.8%, 2라인 1.1%, 3라인 1.6%로 3라인이 가장 높았다.'] },
      { heading: '2. 주요 원인', lines: ['불량의 대부분은 납땜 불량과 치수 공차 초과이며 작업자 숙련도와 설비 노후가 영향을 주었다.'] },
      { heading: '3. 개선 조치', lines: ['3라인 설비 점검과 작업 표준서 개정, 분기별 정기 점검을 시행한다.'] },
    ],
  },
  '생산설비 운영 매뉴얼': {
    slug: 'production-equipment-manual',
    summary:
      '생산설비 운영 매뉴얼은 설비 가동 전 점검, 비상 정지 절차, 일일 청소와 윤활, 고장 시 보고 체계를 단계별로 안내하는 업무 매뉴얼입니다.',
    sections: [
      { heading: '1. 가동 전 점검', lines: ['전원, 안전 덮개, 비상 정지 버튼, 윤활 상태를 확인하고 점검표에 기록한다.'] },
      { heading: '2. 비상 정지', lines: ['이상 소음이나 연기가 발생하면 즉시 비상 정지 버튼을 누르고 팀장에게 보고한다.'] },
      { heading: '3. 일일 관리', lines: ['작업 종료 후 청소와 윤활을 하고, 고장은 ERPilot 생산 관리에서 오더 상태를 "지연"으로 변경해 공유한다.'] },
    ],
  },
};

async function main() {
  const uploadDir = join(process.cwd(), 'uploads', 'documents');
  mkdirSync(uploadDir, { recursive: true });

  const placeholders = await prisma.document.findMany({ where: { fileUrl: { contains: 'seed-placeholder' } } });
  let updated = 0;
  for (const document of placeholders) {
    const content = DEMO_DOCUMENTS[document.title];
    if (!content) {
      console.log(`[seed-docs] 내용이 정의되지 않은 문서라 건너뜁니다: ${document.title}`);
      continue;
    }

    const doc = createKoreanPdfDoc();
    doc.font('Pretendard-Bold').fontSize(20).text(document.title);
    doc.moveDown(1);
    for (const section of content.sections) {
      doc.font('Pretendard-Bold').fontSize(13).text(section.heading);
      doc.font('Pretendard').fontSize(11);
      for (const line of section.lines) doc.text(`· ${line}`, { lineGap: 3 });
      doc.moveDown(0.8);
    }
    const buffer = await pdfDocToBuffer(doc);

    const filename = `seed-${content.slug}.pdf`;
    writeFileSync(join(uploadDir, filename), buffer);
    await prisma.document.update({
      where: { id: document.id },
      data: { fileUrl: `/uploads/documents/${filename}`, fileSize: buffer.length, summary: content.summary, indexStatus: 'DONE' },
    });
    updated++;
  }
  console.log(`[seed-docs] 실제 PDF·요약으로 채운 문서: ${updated}건`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
