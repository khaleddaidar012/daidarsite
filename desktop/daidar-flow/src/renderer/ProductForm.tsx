import { useEffect, useRef, useState } from "react";
import { Save, X } from "lucide-react";
import {
  decimalText,
  inventoryUnits,
  type Product,
  type ProductDraft,
} from "../shared/inventory";
export default function ProductForm({
  open,
  product,
  epoch,
  onSave,
  onCancel,
}: {
  open: boolean;
  product: Product | null;
  epoch: number;
  onSave: (draft: ProductDraft) => Promise<string | null>;
  onCancel: () => void;
}) {
  const initial = (): ProductDraft =>
    product
      ? {
          name: product.name,
          sellingPrice: decimalText(product.selling_price, 2),
          quantity: decimalText(product.quantity, 3),
          barcode: product.barcode ?? "",
          unit: product.unit,
        }
      : {
          name: "",
          sellingPrice: "",
          quantity: "0",
          barcode: "",
          unit: "قطعة",
        };
  const [draft, setDraft] = useState<ProductDraft>(initial);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const name = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setDraft(initial());
    setError("");
  }, [epoch]);
  useEffect(() => {
    if (open) name.current?.focus();
  }, [open, epoch]);
  function change(key: keyof ProductDraft, value: string) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setError("");
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !open) return;
    setBusy(true);
    setError("");
    try {
      const error = await onSave(draft);
      if (error) setError(error);
    } catch {
      setError("تعذر حفظ المنتج. بياناتك ما زالت موجودة؛ أعد المحاولة.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div
      className={`product-collapse ${open ? "open" : ""}`}
      aria-hidden={!open}
    >
      <div>
        <form
          className="product-form"
          onSubmit={(event) => void submit(event)}
          aria-labelledby="product-form-title"
        >
          <fieldset disabled={!open || busy}>
            <div className="product-form-heading">
              <h3 id="product-form-title">
                {product ? "تعديل المنتج" : "إضافة منتج جديد"}
              </h3>
              <button
                type="button"
                aria-label="إغلاق نموذج المنتج"
                onClick={onCancel}
              >
                <X size={17} />
              </button>
            </div>
            <div className="product-fields">
              <label className="product-name-field" htmlFor="product-name">
                اسم المنتج <span>مطلوب</span>
                <input
                  id="product-name"
                  ref={name}
                  required
                  maxLength={160}
                  value={draft.name}
                  onChange={(e) => change("name", e.target.value)}
                  placeholder="مثال: بسكوت سادة"
                />
              </label>
              <label htmlFor="product-price">
                سعر البيع <span>جنيه مصري</span>
                <input
                  id="product-price"
                  required
                  inputMode="decimal"
                  dir="ltr"
                  value={draft.sellingPrice}
                  maxLength={24}
                  onChange={(e) => change("sellingPrice", e.target.value)}
                  placeholder="0.00"
                />
              </label>
              <label htmlFor="product-quantity">
                الكمية
                <input
                  id="product-quantity"
                  required
                  inputMode="decimal"
                  dir="ltr"
                  value={draft.quantity}
                  maxLength={24}
                  onChange={(e) => change("quantity", e.target.value)}
                />
              </label>
              <label htmlFor="product-unit">
                وحدة التخزين
                <select
                  id="product-unit"
                  value={draft.unit}
                  onChange={(e) => change("unit", e.target.value)}
                >
                  {inventoryUnits.map((unit) => (
                    <option key={unit}>{unit}</option>
                  ))}
                </select>
              </label>
              <label
                className="product-barcode-field"
                htmlFor="product-barcode"
              >
                الباركود <span>اختياري</span>
                <input
                  id="product-barcode"
                  type="text"
                  dir="ltr"
                  value={draft.barcode}
                  maxLength={128}
                  onChange={(e) => change("barcode", e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  placeholder="امسح الباركود أو اكتبه يدويًا"
                  autoComplete="off"
                />
                <small>
                  يمكنك تركه فارغًا. الأصفار الأولى تُحفظ كما هي؛ الحفظ من الزر
                  أسفل النموذج.
                </small>
              </label>
            </div>
            {error && (
              <p className="product-form-error" role="alert">
                {error}
              </p>
            )}
            <div className="product-form-actions">
              <button type="submit" className="save-product">
                <Save size={16} />
                {busy
                  ? "جارٍ الحفظ…"
                  : product
                    ? "حفظ التعديلات"
                    : "حفظ المنتج"}
              </button>
              <button type="button" onClick={onCancel}>
                إلغاء
              </button>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
