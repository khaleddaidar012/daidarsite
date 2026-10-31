import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { inventoryMigrations } from "./migrations";
import { InventoryError, productIdentity, validateDraft } from "./validation";
import type {
  Product,
  ProductPage,
  InventoryResult,
} from "../../shared/inventory";
export function inventoryResult<T>(action: () => T): InventoryResult<T> {
  try {
    return { ok: true, data: action() };
  } catch (error) {
    if (error instanceof InventoryError)
      return { ok: false, message: error.message };
    if (
      (error as { errcode?: number }).errcode === 2067 ||
      (error as Error).message?.includes(
        "UNIQUE constraint failed: products.barcode",
      )
    )
      return {
        ok: false,
        message:
          "هذا الباركود مسجل لمنتج آخر، وقد يكون منتجًا معطلًا. استخدم باركودًا مختلفًا.",
      };
    return {
      ok: false,
      message:
        "تعذر إتمام عملية المخزون. تأكد من توفر مساحة وصلاحية الوصول لبيانات البرنامج، ثم أعد المحاولة.",
    };
  }
}
export class ProductsStore {
  private db: DatabaseSync;
  constructor(file: string) {
    if (file !== ":memory:")
      fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    try {
      this.db.exec(
        "PRAGMA foreign_keys=ON;PRAGMA busy_timeout=3000;PRAGMA journal_mode=WAL;PRAGMA synchronous=FULL;",
      );
      this.db.exec("BEGIN IMMEDIATE");
      try {
        this.db.exec(
          "CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY,applied_at TEXT NOT NULL) STRICT;",
        );
        const current = Number(
          this.db
            .prepare(
              "SELECT COALESCE(MAX(version),0) AS version FROM schema_migrations",
            )
            .get()!.version,
        );
        if (current > inventoryMigrations.at(-1)!.version)
          throw Error("Newer schema");
        for (const m of inventoryMigrations) {
          if (m.version > current) {
            this.db.exec(m.sql);
            this.db
              .prepare("INSERT INTO schema_migrations VALUES (?,?)")
              .run(m.version, new Date().toISOString());
          }
        }
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    } catch (error) {
      this.db.close();
      throw error;
    }
  }
  close() {
    this.db.close();
  }
  private get(id: string): Product {
    const row = this.db
      .prepare("SELECT * FROM products WHERE id=? AND is_active=1")
      .get(id);
    if (!row)
      throw new InventoryError("المنتج لم يعد متاحًا. أعد تحميل القائمة.");
    return row as unknown as Product;
  }
  create(input: unknown): Product {
    const v = validateDraft(input),
      id = randomUUID(),
      now = new Date().toISOString();
    this.db
      .prepare(
        "INSERT INTO products(id,name,search_name,selling_price,barcode,quantity,unit,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        v.name,
        v.searchName,
        v.price,
        v.barcode,
        v.quantity,
        v.unit,
        now,
        now,
      );
    return this.get(id);
  }
  update(input: unknown): Product {
    const { id, revision } = productIdentity(input),
      v = validateDraft((input as { draft: unknown }).draft);
    const result = this.db
      .prepare(
        "UPDATE products SET name=?,search_name=?,selling_price=?,barcode=?,quantity=?,unit=?,updated_at=?,revision=revision+1 WHERE id=? AND is_active=1 AND revision=?",
      )
      .run(
        v.name,
        v.searchName,
        v.price,
        v.barcode,
        v.quantity,
        v.unit,
        new Date().toISOString(),
        id,
        revision,
      );
    if (!result.changes)
      throw new InventoryError(
        "المنتج تغير أو تم تعطيله. أعد تحميل القائمة قبل التعديل.",
      );
    return this.get(id);
  }
  remove(input: unknown): null {
    const { id, revision } = productIdentity(input);
    const result = this.db
      .prepare(
        "UPDATE products SET is_active=0,updated_at=?,revision=revision+1 WHERE id=? AND revision=? AND is_active=1",
      )
      .run(new Date().toISOString(), id, revision);
    if (!result.changes)
      throw new InventoryError("المنتج تغير أو تم تعطيله. أعد تحميل القائمة.");
    return null;
  }
  list(input: unknown): ProductPage {
    if (!input || typeof input !== "object")
      throw new InventoryError("طلب البحث غير صحيح.");
    const v = input as { search: string; page: number };
    if (
      typeof v.search !== "string" ||
      v.search.length > 120 ||
      !Number.isSafeInteger(v.page) ||
      v.page < 1 ||
      v.page > 10000000
    )
      throw new InventoryError("البحث أو رقم الصفحة غير صحيح.");
    const term =
      "%" +
      v.search
        .trim()
        .normalize("NFKC")
        .toLowerCase()
        .replace(/[\\%_]/g, "\\$&") +
      "%";
    const where =
      "is_active=1 AND (search_name LIKE ? ESCAPE '\\' OR barcode LIKE ? ESCAPE '\\')";
    const total = Number(
      this.db
        .prepare("SELECT count(*) AS n FROM products WHERE is_active=1")
        .get()!.n,
    );
    const matched = Number(
      this.db
        .prepare("SELECT count(*) AS n FROM products WHERE " + where)
        .get(term, term)!.n,
    );
    const pageSize = 30,
      pages = Math.max(1, Math.ceil(matched / pageSize)),
      page = Math.min(v.page, pages);
    const items = this.db
      .prepare(
        "SELECT * FROM products WHERE " +
          where +
          " ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?",
      )
      .all(term, term, pageSize, (page - 1) * pageSize) as unknown as Product[];
    return { items, total, matched, page, pages, pageSize };
  }
}
