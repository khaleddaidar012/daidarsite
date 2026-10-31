import {
  inventoryUnits,
  type ProductDraft,
  type InventoryUnit,
} from "../../shared/inventory";
export class InventoryError extends Error {}
export function scaledNumber(
  input: unknown,
  precision: number,
  label: string,
): number {
  if (typeof input !== "string" || input.length > 24)
    throw new InventoryError(`أدخل ${label} صحيحًا.`);
  const value = input
    .trim()
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
    .replace(/[٫,]/g, ".");
  if (!new RegExp(`^\\d{1,9}(?:\\.\\d{1,${precision}})?$`).test(value))
    throw new InventoryError(
      `${label} يجب أن يكون غير سالب، وبحد أقصى ${precision} أرقام عشرية.`,
    );
  const [integer, fraction = ""] = value.split("."),
    result =
      Number(integer) * 10 ** precision +
      Number(fraction.padEnd(precision, "0"));
  if (!Number.isSafeInteger(result))
    throw new InventoryError(`قيمة ${label} أكبر من المسموح.`);
  return result;
}
export function validateDraft(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new InventoryError("بيانات المنتج غير صحيحة.");
  const p = input as ProductDraft;
  if (
    typeof p.name !== "string" ||
    p.name.length > 160 ||
    !p.name.trim() ||
    /[\x00-\x1f\x7f]/.test(p.name)
  )
    throw new InventoryError("اسم المنتج مطلوب، وبحد أقصى160 حرفًا.");
  if (p.unit !== undefined && !inventoryUnits.includes(p.unit))
    throw new InventoryError("اختر وحدة تخزين صحيحة.");
  const unit: InventoryUnit = p.unit ?? "قطعة";
  const price = scaledNumber(p.sellingPrice, 2, "سعر البيع"),
    quantity = scaledNumber(p.quantity, 3, "الكمية");
  if (["قطعة", "علبة", "كرتونة"].includes(unit) && quantity % 1000 !== 0)
    throw new InventoryError(
      "هذه الوحدة تقبل كميات صحيحة فقط. استخدم وحدة وزن أو حجم للكميات العشرية.",
    );
  if (
    p.barcode !== undefined &&
    (typeof p.barcode !== "string" ||
      p.barcode.length > 128 ||
      /[\x00-\x20\x7f]/.test(p.barcode.trim()))
  )
    throw new InventoryError(
      "الباركود يجب أن يكون نصًا حتى128 حرفًا بدون مسافات أو أحرف تحكم.",
    );
  const name = p.name.trim().replace(/\s+/g, " ");
  return {
    name,
    searchName: name.normalize("NFKC").toLowerCase(),
    price,
    quantity,
    unit,
    barcode: p.barcode?.trim() || null,
  };
}
export function productIdentity(input: unknown): {
  id: string;
  revision: number;
} {
  if (!input || typeof input !== "object")
    throw new InventoryError("المنتج غير صحيح.");
  const v = input as { id: string; revision: number };
  if (
    typeof v.id !== "string" ||
    !/^[a-f0-9-]{36}$/.test(v.id) ||
    !Number.isSafeInteger(v.revision) ||
    v.revision < 1
  )
    throw new InventoryError("المنتج غير صحيح. أعد تحميل القائمة.");
  return v;
}
