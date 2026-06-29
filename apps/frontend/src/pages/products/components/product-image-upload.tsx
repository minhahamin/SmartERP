import { useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface ProductImageUploadProps {
  /** 표시할 미리보기 URL(새로 고른 파일의 blob URL 또는 기존 저장된 이미지의 절대 URL) — 부모가 관리한다 */
  value?: string;
  onChange: (file: File | undefined) => void;
}

function ProductImageUpload({ value, onChange }: ProductImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-1.5">
      <Label>제품 이미지</Label>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        className="relative flex size-28 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-gray-50 text-muted-foreground transition-colors hover:border-primary/50"
      >
        {value ? (
          <img src={value} alt="제품 이미지 미리보기" className="size-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <ImagePlus className="size-5" />
            <span className="text-[11px]">이미지 업로드</span>
          </div>
        )}
        {value && (
          <button
            type="button"
            aria-label="이미지 제거"
            onClick={(event) => {
              event.stopPropagation();
              onChange(undefined);
            }}
            className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
          >
            <X className="size-3" />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onChange(file);
          event.target.value = '';
        }}
      />
    </div>
  );
}

export { ProductImageUpload };
