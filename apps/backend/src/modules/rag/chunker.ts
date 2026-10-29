const DEFAULT_MAX_CHARS = 800;
const DEFAULT_OVERLAP = 100;

/**
 * 문서 본문을 임베딩 단위로 나눈다. 문단(빈 줄) 경계를 우선 지키고, 한 문단이 maxChars보다 길면
 * 글자 수로 자르되 앞 조각의 끝 overlap 글자를 다음 조각에 겹쳐 문맥이 끊기지 않게 한다.
 */
export function chunkText(text: string, maxChars = DEFAULT_MAX_CHARS, overlap = DEFAULT_OVERLAP): string[] {
  const paragraphs = text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';

  const flush = () => {
    if (current) chunks.push(current);
    current = '';
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      flush();
      const step = maxChars - overlap;
      for (let start = 0; start < paragraph.length; start += step) {
        chunks.push(paragraph.slice(start, start + maxChars));
        if (start + maxChars >= paragraph.length) break;
      }
      continue;
    }
    if (current && current.length + paragraph.length + 1 > maxChars) flush();
    current = current ? `${current} ${paragraph}` : paragraph;
  }
  flush();

  return chunks;
}
