import { memo } from "react";
import { MoreHorizontal, Package, Pencil, Trash2 } from "lucide-react";
import {
  decimalText,
  LOW_STOCK_MILLI,
  stockStatus,
  type Product,
} from "../shared/inventory";
export default memo(function ProductCard({
  product,
  onEdit,
  onDelete,
  confirming,
  onConfirm,
  onCancel,
  busy,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
  confirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const status =
    product.quantity === 0
      ? "out"
      : product.quantity <= LOW_STOCK_MILLI
        ? "low"
        : "available";
  return (
    <article className="product-card" data-product={product.id}>
      <div className="product-card-top">
        <span className="product-icon">
          <Package size={22} />
        </span>
        <details
          className="product-menu"
          onKeyDown={(event) => {
            if (event.key === "Escape") event.currentTarget.open = false;
          }}
          onBlur={(event) => {
            if (
              !event.currentTarget.contains(event.relatedTarget as Node | null)
            )
              event.currentTarget.open = false;
          }}
        >
          <summary aria-label={`قائمة ${product.name}`}>
            <MoreHorizontal size={22} />
          </summary>
          <div>
            <button
              type="button"
              disabled={busy}
              onClick={(event) => {
                event.currentTarget.closest("details")!.open = false;
                onEdit();
              }}
            >
              <Pencil size={14} /> تعديل المنتج
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={(event) => {
                event.currentTarget.closest("details")!.open = false;
                onDelete();
              }}
            >
              <Trash2 size={14} /> حذف المنتج
            </button>
          </div>
        </details>
      </div>
      <h3>{product.name}</h3>
      <p className="product-price">
        <bdi>
          {Number(decimalText(product.selling_price, 2)).toLocaleString(
            "ar-EG",
            { minimumFractionDigits: 2, maximumFractionDigits: 2 },
          )}
        </bdi>
        <small>ج.م</small>
      </p>
      <div className="product-quantity">
        <span>الكمية المتاحة</span>
        <strong>
          <bdi>{decimalText(product.quantity, 3)}</bdi>{" "}
          <small>{product.unit}</small>
        </strong>
      </div>
      <div className="product-card-bottom">
        <span className={`stock-badge ${status}`}>
          <i />
          {stockStatus(product.quantity)}
        </span>
        {product.barcode && (
          <span className="product-barcode" title={product.barcode}>
            باركود <bdi>{product.barcode}</bdi>
          </span>
        )}
      </div>
      {confirming && (
        <div className="product-delete-confirm" role="alert">
          <p>
            حذف «{product.name}» من المخزون؟ سيُعطّل المنتج مع الاحتفاظ بسجله.
          </p>
          <button type="button" disabled={busy} onClick={onConfirm}>
            تأكيد الحذف
          </button>
          <button type="button" disabled={busy} onClick={onCancel}>
            إلغاء الحذف
          </button>
        </div>
      )}
    </article>
  );
});
