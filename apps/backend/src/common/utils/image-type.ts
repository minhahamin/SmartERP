export interface DetectedImage {
  /** 저장할 확장자 — 사용자가 보낸 파일명이 아니라 실제 내용으로 정한다 */
  ext: 'png' | 'jpg' | 'gif' | 'webp';
  mime: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
}

/** 업로드 허용 이미지 MIME. SVG는 스크립트를 담을 수 있어 의도적으로 제외한다 */
export const ALLOWED_IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

/**
 * 파일 앞부분의 매직 넘버로 이미지 종류를 판별한다. 업로드 요청의 Content-Type과 파일명은
 * 클라이언트가 마음대로 정할 수 있어서(예: .html을 image/png로 위장) 신뢰하지 않는다.
 * PNG/JPEG/GIF/WEBP가 아니면 null.
 */
export function detectImageType(buffer: Buffer): DetectedImage | null {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { ext: 'png', mime: 'image/png' };
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }
  if (buffer.length >= 6) {
    const head = buffer.subarray(0, 6).toString('ascii');
    if (head === 'GIF87a' || head === 'GIF89a') return { ext: 'gif', mime: 'image/gif' };
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }
  return null;
}
