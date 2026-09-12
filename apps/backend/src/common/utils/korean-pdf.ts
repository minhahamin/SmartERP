import { join } from 'path';
import PDFDocument from 'pdfkit';

// Pretendard(OFL-1.1, https://github.com/orioncactus/pretendard) — pdfkit 기본 폰트(Helvetica 등)는
// 한글 글리프가 없어 한국어 PDF에는 실제 한글을 지원하는 폰트 파일을 직접 임베드해야 한다.
// assets/ 아래 정적 파일로 두고 Dockerfile에서 함께 복사한다(dist만으로는 빠짐 — apps/backend/Dockerfile 참고).
const FONT_REGULAR = join(process.cwd(), 'assets/fonts/Pretendard-Regular.otf');
const FONT_BOLD = join(process.cwd(), 'assets/fonts/Pretendard-Bold.otf');

/** 한글 PDF 생성에 필요한 폰트를 등록해서 반환한다 — 호출자는 doc.font('Pretendard'|'Pretendard-Bold')만 쓰면 된다 */
export function createKoreanPdfDoc(options?: PDFKit.PDFDocumentOptions): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: 50, ...options });
  doc.registerFont('Pretendard', FONT_REGULAR);
  doc.registerFont('Pretendard-Bold', FONT_BOLD);
  doc.font('Pretendard');
  return doc;
}

/** PDFDocument(Readable 스트림)를 끝까지 읽어 Buffer로 모은다 — HTTP 응답에 Content-Length를 함께 보낼 때 사용 */
export function pdfDocToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}
