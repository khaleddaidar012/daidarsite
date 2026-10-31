export const inventoryUnits = [
  "قطعة",
  "علبة",
  "كرتونة",
  "كيلوجرام",
  "جرام",
  "لتر",
] as const;
export type InventoryUnit = (typeof inventoryUnits)[number];
export const LOW_STOCK_MILLI = 5000;
export interface Product {
  id: string;
  name: string;
  selling_price: number;
  barcode: string | null;
  quantity: number;
  unit: InventoryUnit;
  created_at: string;
  updated_at: string;
  is_active: number;
  revision: number;
}
// Money in piastres; quantity in thousandths of the single storage unit.
export interface ProductDraft {
  name: string;
  sellingPrice: string;
  quantity: string;
  barcode: string;
  unit: InventoryUnit;
}
export interface ProductPage {
  items: Product[];
  total: number;
  matched: number;
  page: number;
  pages: number;
  pageSize: number;
}
export type InventoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };
export interface InventoryBridge {
  list(input: {
    search: string;
    page: number;
  }): Promise<InventoryResult<ProductPage>>;
  create(input: ProductDraft): Promise<InventoryResult<Product>>;
  update(input: {
    id: string;
    revision: number;
    draft: ProductDraft;
  }): Promise<InventoryResult<Product>>;
  remove(input: {
    id: string;
    revision: number;
  }): Promise<InventoryResult<null>>;
}
export function stockStatus(quantity: number) {
  return quantity === 0
    ? "نفد المخزون"
    : quantity <= LOW_STOCK_MILLI
      ? "مخزون منخفض"
      : "متوفر";
}
export function decimalText(scaled: number, precision: number): string {
  const scale = 10 ** precision;
  return `${Math.floor(scaled / scale)}${
    scaled % scale
      ? "." +
        String(scaled % scale)
          .padStart(precision, "0")
          .replace(/0+$/, "")
      : ""
  }`;
}
