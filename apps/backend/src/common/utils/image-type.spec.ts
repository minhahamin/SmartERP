import { detectImageType } from './image-type';

describe('detectImageType — 파일 내용으로 이미지 종류를 판별한다', () => {
  it('PNG/JPEG/GIF/WEBP를 매직 넘버로 알아본다', () => {
    expect(detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]))).toEqual({
      ext: 'png',
      mime: 'image/png',
    });
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toEqual({
      ext: 'jpg',
      mime: 'image/jpeg',
    });
    expect(detectImageType(Buffer.from('GIF89a....'))).toEqual({ ext: 'gif', mime: 'image/gif' });
    expect(detectImageType(Buffer.from('GIF87a....'))).toEqual({ ext: 'gif', mime: 'image/gif' });
    expect(
      detectImageType(
        Buffer.concat([Buffer.from('RIFF'), Buffer.from([1, 2, 3, 4]), Buffer.from('WEBPVP8 ')]),
      ),
    ).toEqual({ ext: 'webp', mime: 'image/webp' });
  });

  it('HTML/SVG/JS는 이미지 확장자나 Content-Type으로 위장해도 거부한다', () => {
    expect(detectImageType(Buffer.from('<html><script>alert(1)</script></html>'))).toBeNull();
    expect(
      detectImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')),
    ).toBeNull();
    expect(detectImageType(Buffer.from('document.title="x"'))).toBeNull();
  });

  it('너무 짧거나 비어 있는 파일은 거부한다', () => {
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
    expect(detectImageType(Buffer.from([0x89, 0x50]))).toBeNull();
  });

  it('RIFF지만 WEBP가 아닌 파일(WAV/AVI 등)은 거부한다', () => {
    expect(
      detectImageType(
        Buffer.concat([Buffer.from('RIFF'), Buffer.from([1, 2, 3, 4]), Buffer.from('WAVEfmt ')]),
      ),
    ).toBeNull();
  });
});
