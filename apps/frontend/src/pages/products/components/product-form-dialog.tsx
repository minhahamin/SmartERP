import { useEffect, useState, type FormEvent } from 'react';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProductImageUpload } from '@/pages/products/components/product-image-upload';
import { useCreateProduct, useUpdateProduct, useUploadProductImage } from '@/pages/products/hooks/use-products';
import { toAbsoluteImageUrl, type Product } from '@/pages/products/api/products-api';

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
}

const EMPTY_FORM = {
  sku: '',
  name: '',
  category: '',
  unit: 'EA',
  salePrice: 0,
  costPrice: 0,
  safetyStock: 0,
};

function ProductFormDialog({ open, onOpenChange, product }: ProductFormDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | undefined>(undefined);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | undefined>(undefined);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const uploadImage = useUploadProductImage();
  const isEdit = Boolean(product);
  const isSubmitting = createProduct.isPending || updateProduct.isPending || uploadImage.isPending;

  useEffect(() => {
    if (!open) return;
    setImageFile(undefined);
    if (product) {
      setForm({
        sku: product.sku,
        name: product.name,
        category: product.category ?? '',
        unit: product.unit,
        salePrice: product.salePrice,
        costPrice: product.costPrice,
        safetyStock: product.safetyStock,
      });
      setImagePreviewUrl(toAbsoluteImageUrl(product.imageUrl));
    } else {
      setForm(EMPTY_FORM);
      setImagePreviewUrl(undefined);
    }
  }, [open, product]);

  const handleImageChange = (file: File | undefined) => {
    setImageFile(file);
    setImagePreviewUrl(file ? URL.createObjectURL(file) : undefined);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const saved = isEdit && product
      ? await updateProduct.mutateAsync({ id: product.id, input: form })
      : await createProduct.mutateAsync(form);
    if (imageFile) {
      await uploadImage.mutateAsync({ id: saved.id, file: imageFile });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader>
            <DialogTitle>{isEdit ? '제품 정보 수정' : '제품 등록'}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <ProductImageUpload value={imagePreviewUrl} onChange={handleImageChange} />
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="product-name">제품명</Label>
                <Input id="product-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="product-sku">SKU</Label>
                <Input
                  id="product-sku"
                  required
                  disabled={isEdit}
                  placeholder="자동 생성 또는 직접 입력"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="product-category">분류</Label>
                <Input id="product-category" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="product-unit">단위</Label>
                <Input id="product-unit" required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="product-safety">안전재고</Label>
                <Input
                  id="product-safety"
                  type="number"
                  required
                  value={form.safetyStock}
                  onChange={(e) => setForm({ ...form, safetyStock: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="product-cost">원가</Label>
                <Input
                  id="product-cost"
                  type="number"
                  required
                  value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="product-price">판매가</Label>
                <Input
                  id="product-price"
                  type="number"
                  required
                  value={form.salePrice}
                  onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? '저장' : '등록'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { ProductFormDialog };
