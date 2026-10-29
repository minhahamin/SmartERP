import { classifyDocument } from './document-classifier';

describe('classifyDocument', () => {
  it('제목의 키워드를 우선해 분류한다', () => {
    expect(classifyDocument('한빛전자 납품 계약서', '').category).toBe('CONTRACT');
    expect(classifyDocument('재택근무 운영 지침', '본 지침은 재택근무의 기준을 정한다.').category).toBe('POLICY');
    expect(classifyDocument('ERP 사용 매뉴얼', '').category).toBe('MANUAL');
  });

  it('제목에 단서가 없으면 본문 앞부분의 키워드로 판단한다', () => {
    expect(classifyDocument('2026년 3분기', '3분기 실적 분석 결과 보고서입니다. 현황은 다음과 같다.').category).toBe('REPORT');
  });

  it('근거가 약하면 판단하지 않고 기타로 둔다', () => {
    expect(classifyDocument('메모', '점심 메뉴 정리').category).toBe('ETC');
    expect(classifyDocument('', '').score).toBe(0);
  });
});
