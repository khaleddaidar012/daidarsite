import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Package, Plus, Search, RefreshCw } from "lucide-react";
import type { ProductPage, Product, ProductDraft } from "../shared/inventory";
import "./inventory.css";
import ProductCard from "./ProductCard";
import ProductForm from "./ProductForm";
function Inventory({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<ProductPage | null>(null),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const request = useRef(0);
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (search === query) return;
    const timer = window.setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [search, query]);
  const [formOpen, setFormOpen] = useState(false),
    [formEpoch, setFormEpoch] = useState(0);
  const [editing, setEditing] = useState<Product | null>(null),
    [deleting, setDeleting] = useState<Product | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [revision, setRevision] = useState(0);
  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    setError("");
    try {
      const result = await window.daidar.inventory.list({
        search: query,
        page,
      });
      if (id !== request.current) return;
      if (result.ok) {
        setData(result.data);
      } else {
        setError(result.message);
      }
    } catch {
      if (id === request.current) setError("تعذر تحميل المخزون. أعد المحاولة.");
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [query, page, revision]);
  useEffect(() => {
    void load();
    return () => {
      request.current++;
    };
  }, [load]);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 5000);
    return () => window.clearTimeout(timer);
  }, [message]);
  async function save(draft: ProductDraft): Promise<string | null> {
    setBusy(true);
    try {
      const result = editing
        ? await window.daidar.inventory.update({
            id: editing.id,
            revision: editing.revision,
            draft,
          })
        : await window.daidar.inventory.create(draft);
      if (!result.ok) return result.message;
      setMessage(editing ? "تم حفظ التعديلات." : "تمت إضافة المنتج.");
      setFormOpen(false);
      setEditing(null);
      setSearch("");
      setQuery("");
      setPage(1);
      setRevision((v) => v + 1);
      return null;
    } catch {
      return "تعذر حفظ المنتج. أعد المحاولة، بياناتك لم تُمسح.";
    } finally {
      setBusy(false);
    }
  }
  function edit(product: Product) {
    setEditing(product);
    setFormEpoch((v) => v + 1);
    setFormOpen(true);
    setDeleting(null);
    document
      .querySelector(".inventory-toolbar")
      ?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
  }
  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    try {
      const result = await window.daidar.inventory.remove({
        id: deleting.id,
        revision: deleting.revision,
      });
      if (result.ok) {
        setMessage("تم حذف المنتج من القائمة مع الاحتفاظ بسجله.");
        setDeleting(null);
        setRevision((v) => v + 1);
      } else setError(result.message);
    } catch {
      setError("تعذر حذف المنتج. أعد المحاولة.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="inventory" aria-labelledby="inventory-title">
      <div className="inventory-heading">
        <div>
          <h2 id="inventory-title">المخزون</h2>
          <p>
            إدارة منتجاتك وكمياتها{" "}
            <span className="product-total">{data?.total ?? "—"} منتج</span>
          </p>
        </div>
        <button
          className="inventory-back"
          type="button"
          disabled={busy}
          onClick={onBack}
        >
          <ArrowRight size={16} /> العودة للأدوات
        </button>
      </div>
      <div className="inventory-toolbar">
        <div className="inventory-search">
          <Search size={18} />
          <input
            aria-label="بحث بالاسم أو الباركود"
            placeholder="ابحث باسم المنتج أو الباركود"
            value={search}
            maxLength={120}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <button
          type="button"
          className="inventory-add"
          disabled={busy}
          aria-expanded={formOpen}
          onClick={() => {
            setEditing(null);
            setFormEpoch((v) => v + 1);
            setFormOpen((v) => !v);
            setDeleting(null);
          }}
        >
          <Plus size={18} /> إضافة منتج
        </button>
      </div>
      <ProductForm
        epoch={formEpoch}
        open={formOpen}
        product={editing}
        onCancel={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSave={save}
      />
      {message && (
        <p className="inventory-success" role="status">
          {message}
        </p>
      )}
      {error ? (
        <div className="inventory-state inventory-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => void load()}>
            <RefreshCw size={15} /> إعادة المحاولة
          </button>
        </div>
      ) : loading || search !== query ? (
        <p className="inventory-state" role="status">
          جارٍ تحميل المنتجات…
        </p>
      ) : !data?.items.length ? (
        <div className="inventory-state">
          <Package size={42} />
          <h3>{query ? "لا توجد منتجات مطابقة" : "مخزونك يبدأ بأول منتج"}</h3>
          <p>
            {query
              ? "جرّب اسمًا أو باركودًا آخر."
              : "أضف منتجاتك الحقيقية، وهتلاقيها هنا جاهزة للمتابعة."}
          </p>
        </div>
      ) : (
        <>
          <p className="inventory-results">
            {data.matched} {query ? "نتيجة بحث" : "منتج مسجل"}
          </p>
          <div className="product-grid">
            {data.items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={() => edit(product)}
                onDelete={() => setDeleting(product)}
                confirming={deleting?.id === product.id}
                onConfirm={() => void remove()}
                onCancel={() => setDeleting(null)}
                busy={busy}
              />
            ))}
          </div>
        </>
      )}
      {!loading && !error && search === query && data && data.pages > 1 && (
        <nav className="inventory-pagination" aria-label="صفحات المخزون">
          <button
            type="button"
            disabled={busy || data.page === 1}
            onClick={() => setPage(data.page - 1)}
          >
            السابق
          </button>
          <span>
            صفحة {data.page} من {data.pages}
          </span>
          <button
            type="button"
            disabled={busy || data.page === data.pages}
            onClick={() => setPage(data.page + 1)}
          >
            التالي
          </button>
        </nav>
      )}
    </section>
  );
}
export default memo(Inventory);
