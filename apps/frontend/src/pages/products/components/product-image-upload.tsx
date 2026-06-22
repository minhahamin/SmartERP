import { useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface ProductImageUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
}

/**
 * 실제 백엔드(S3 등)가 없는 상태에서 이미지를 "업로드"한 것처럼 보여주기 위해
 * 선택한 파일을 URL.createObjectURL로 로컬 미리보기 URL로 변환한다.
 * 새로고침하면 사라지는 임시 URL이라는 한계는 있지만, 폼/목록/상세 화면에서
 * 실제 업로드 플로우(클릭 → 파일 선택 → 즉시 미리보기 → 제거)를 동일하게 시연할 수 있다.
 */
function ProductImageUpload({ value, onChange }: ProductImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    onChange(URL.createObjectURL(file));
  };

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
          if (file) handleFile(file);
          event.target.value = '';
        }}
      />
    </div>
  );
}

export { ProductImageUpload };
