/** 인증 기반 GET을 blob으로 받아온 뒤 브라우저 다운로드를 트리거한다(Content-Disposition 헤더 없이 파일명을 직접 지정) */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
