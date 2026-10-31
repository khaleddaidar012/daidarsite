import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import {
  KeyRound,
  ShieldCheck,
  Copy,
  Download,
  RefreshCw,
  FolderOpen,
  ArrowRight,
  Check,
  Search,
  Monitor,
} from "lucide-react";
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/700.css";
import "./styles.css";
import type { AdminLicense, AdminState } from "./contracts";
import type { PaidFeature } from "../../src/main/licensing/protocol";
const options: { id: PaidFeature; label: string }[] = [
  { id: "analytics", label: "تحليل المبيعات" },
  { id: "suppliers", label: "حسابات الموردين" },
  { id: "employees", label: "إدارة الموظفين" },
  { id: "encryption", label: "التشفير المتقدم" },
  { id: "cloud-backup", label: "النسخ الاحتياطي أونلاين" },
];
const durations = [
  { months: 1, label: "شهر" },
  { months: 3, label: "3 أشهر" },
  { months: 6, label: "6 أشهر" },
  { months: 12, label: "سنة" },
];
const date = (value: string) =>
  new Date(value).toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
function App() {
  const [state, setState] = useState<AdminState | null>(null),
    [customer, setCustomer] = useState(""),
    [device, setDevice] = useState(""),
    [months, setMonths] = useState(1),
    [features, setFeatures] = useState<PaidFeature[]>(
      options.map((item) => item.id),
    );
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [selected, setSelected] = useState<AdminLicense | null>(null),
    [transfer, setTransfer] = useState<AdminLicense | null>(null),
    [reason, setReason] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [search, setSearch] = useState("");
  async function refresh() {
    try {
      setState(await window.licenseAdmin.state());
    } catch {
      setMessage("تعذر تحميل السجل. أعد المحاولة.");
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  const deviceId = device.trim().toUpperCase(),
    validDevice = /^DFD1-[A-F0-9]{64}$/.test(deviceId);
  async function issue(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await window.licenseAdmin.issue({
        customer,
        deviceId,
        months,
        features,
        previousId: transfer?.license.licenseId,
        reason,
        confirmed,
      });
      setMessage(result.message);
      if (result.ok && result.record) {
        setSelected(result.record);
        setDevice("");
        setTransfer(null);
        setReason("");
        setConfirmed(false);
        await refresh();
      }
    } catch {
      setMessage("تعذر إتمام الإصدار. راجع السجل قبل إعادة المحاولة.");
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    if (!selected) return;
    try {
      setMessage(
        (await window.licenseAdmin.copy(selected.license.licenseId))
          ? "تم نسخ كود التفعيل. أرسله للعميل."
          : "تعذر نسخ الكود؛ قد يكون الترخيص جرى استبداله.",
      );
    } catch {
      setMessage("تعذر نسخ الكود.");
    }
  }
  async function save() {
    if (!selected) return;
    setBusy(true);
    try {
      const result = await window.licenseAdmin.save(selected.license.licenseId);
      if (result) setMessage(result.message);
    } catch {
      setMessage("تعذر حفظ الملف.");
    } finally {
      setBusy(false);
    }
  }
  async function selectVault() {
    setBusy(true);
    try {
      const value = await window.licenseAdmin.selectVault();
      if (value) {
        setState(value);
        setSelected(null);
        setTransfer(null);
        setMessage("");
      }
    } catch {
      setMessage("تعذر اختيار الخزنة.");
    } finally {
      setBusy(false);
    }
  }
  function newIssue() {
    setTransfer(null);
    setSelected(null);
    setCustomer("");
    setDevice("");
    setMonths(1);
    setFeatures(options.map((item) => item.id));
    setReason("");
    setConfirmed(false);
    setMessage("");
  }
  function beginTransfer(item: AdminLicense) {
    setTransfer(item);
    setSelected(null);
    setCustomer(item.license.customer);
    setMonths(item.license.months);
    setFeatures(item.license.features);
    setDevice("");
    setReason("");
    setConfirmed(false);
    setMessage("");
    document.querySelector<HTMLInputElement>("#device")?.focus();
  }
  const records = (state?.records || []).filter((item) =>
    (item.license.customer + item.license.deviceId + item.license.licenseId)
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div className="admin-shell">
      <header>
        <div className="brand">
          <img src="./logo.png" alt="شعار دعيدر" />
          <div>
            <strong>دعيدر فلو</strong>
            <small>إدارة التراخيص والتفعيل</small>
          </div>
        </div>
        <span className="admin-pill">
          <ShieldCheck size={15} /> أداة الإدارة فقط
        </span>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <p className="eyebrow">تراخيص عملائك، من مكان واحد</p>
            <h1>إصدار كود تفعيل</h1>
            <p>الصق معرف الجهاز، اختر المدة، وابعث الكود للعميل.</p>
          </div>
          <KeyRound className="heading-icon" size={32} />
        </div>
        <div className={`vault ${state?.ready ? "ready" : "unavailable"}`}>
          <div>
            <ShieldCheck size={18} />
            <span>{state?.message || "جارٍ تحميل خزنة الإدارة…"}</span>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void selectVault()}
          >
            <FolderOpen size={15} /> اختيار الخزنة
          </button>
        </div>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        <div className="workspace">
          <section className="panel form-panel">
            <div className="panel-heading">
              <h2>{transfer ? "نقل الترخيص لجهاز آخر" : "بيانات الترخيص"}</h2>
              {transfer && (
                <button type="button" disabled={busy} onClick={newIssue}>
                  <ArrowRight size={14} /> إلغاء النقل
                </button>
              )}
            </div>
            <form onSubmit={(event) => void issue(event)}>
              <label htmlFor="device">
                معرف جهاز العميل {transfer && "الجديد"}
                <span className="required">مطلوب</span>
              </label>
              <textarea
                id="device"
                dir="ltr"
                value={device}
                onChange={(event) => setDevice(event.target.value)}
                placeholder="DFD1-…"
                spellCheck={false}
                maxLength={200}
                required
                disabled={busy}
              />
              <p
                className={`field-help ${device && !validDevice ? "invalid" : ""}`}
              >
                {device && !validDevice
                  ? "الصق معرف الجهاز كاملًا كما نسخه العميل، ويبدأ بـ DFD1-."
                  : "العميل ينسخه من صفحة «التفعيل والاشتراك»."}
              </p>
              <label htmlFor="customer">
                اسم العميل{" "}
                <span className="optional">اختياري، لتنظيم سجلك فقط</span>
              </label>
              <input
                id="customer"
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                placeholder="مثال: سوبر ماركت النور"
                maxLength={160}
                disabled={busy || !!transfer}
              />
              <fieldset disabled={busy || !!transfer}>
                <legend>مدة الاشتراك</legend>
                <div className="durations">
                  {durations.map((item) => (
                    <label
                      className={months === item.months ? "chosen" : ""}
                      key={item.months}
                    >
                      <input
                        type="radio"
                        name="months"
                        value={item.months}
                        checked={months === item.months}
                        onChange={() => setMonths(item.months)}
                      />
                      {item.label}
                      {months === item.months && <Check size={14} />}
                    </label>
                  ))}
                </div>
              </fieldset>
              <details>
                <summary>
                  المميزات المشمولة <span>{features.length} مميزات</span>
                </summary>
                <div className="features">
                  {options.map((item) => (
                    <label key={item.id}>
                      <input
                        type="checkbox"
                        checked={features.includes(item.id)}
                        disabled={busy || !!transfer}
                        onChange={(event) =>
                          setFeatures(
                            event.target.checked
                              ? [...features, item.id]
                              : features.filter((id) => id !== item.id),
                          )
                        }
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              </details>
              {transfer ? (
                <div className="transfer-note">
                  <p>
                    سيحتفظ الترخيص بنهايته الحالية:{" "}
                    <strong>{date(transfer.license.expiresAt)}</strong>. الكود
                    القديم لا يُلغى فورًا إذا كان الجهاز Offline.
                  </p>
                  <label htmlFor="reason">سبب تغيير الجهاز</label>
                  <input
                    id="reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    maxLength={1000}
                    required
                    disabled={busy}
                  />
                  <label className="confirmation">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(event) => setConfirmed(event.target.checked)}
                      disabled={busy}
                    />{" "}
                    راجعت طلب العميل وطلبت إيقاف استخدام الجهاز القديم.
                  </label>
                </div>
              ) : (
                <p className="start-note">
                  يبدأ الاشتراك من وقت الإصدار. المميزات المجانية تظل متاحة
                  دائمًا.
                </p>
              )}
              <button
                className="primary issue-button"
                type="submit"
                disabled={
                  !state?.ready ||
                  busy ||
                  !validDevice ||
                  !features.length ||
                  (!!transfer && (!reason.trim() || !confirmed))
                }
              >
                <KeyRound size={17} />
                {busy
                  ? "جارٍ تنفيذ العملية…"
                  : transfer
                    ? "إصدار الترخيص البديل"
                    : "إصدار كود التفعيل"}
              </button>
            </form>
          </section>
          <section className="panel result-panel">
            <div className="panel-heading">
              <h2>{selected ? "الترخيص جاهز للإرسال" : "كود التفعيل"}</h2>
              {selected && (
                <span className="success-label">
                  <Check size={14} /> تم التوقيع
                </span>
              )}
            </div>
            {selected ? (
              <>
                <div className="license-summary">
                  <span>{selected.license.customer}</span>
                  <strong>{date(selected.license.expiresAt)}</strong>
                  <small>تاريخ انتهاء الاشتراك</small>
                  <p>
                    <Monitor size={14} />
                    <bdi>{selected.license.deviceId}</bdi>
                  </p>
                </div>
                <label htmlFor="result-code">الكود الموقّع</label>
                <textarea
                  id="result-code"
                  dir="ltr"
                  readOnly
                  value={selected.code}
                />
                <div className="result-actions">
                  <button
                    className="primary"
                    type="button"
                    disabled={busy || selected.superseded}
                    onClick={() => void copy()}
                  >
                    <Copy size={16} /> نسخ الكود
                  </button>
                  <button
                    type="button"
                    disabled={busy || selected.superseded}
                    onClick={() => void save()}
                  >
                    <Download size={16} /> حفظ ملف الترخيص
                  </button>
                </div>
                <p className="field-help">
                  أرسل الكود أو ملف .dfl للعميل؛ يفعّله من صفحة الاشتراك.
                </p>
                <button
                  type="button"
                  className="text-button"
                  disabled={busy}
                  onClick={newIssue}
                >
                  إصدار ترخيص جديد <ArrowRight size={14} />
                </button>
              </>
            ) : (
              <div className="empty-result">
                <div>
                  <KeyRound size={34} />
                </div>
                <h3>جاهز لأول كود</h3>
                <p>بعد الإصدار هتلاقي الكود هنا، مع زر للنسخ وزر لحفظ الملف.</p>
                <span>المفتاح الخاص يظل داخل خزنة الإدارة المحمية.</span>
              </div>
            )}
          </section>
        </div>
        <section className="panel history">
          <div className="panel-heading">
            <div>
              <h2>سجل التراخيص</h2>
              <p>ارجع لأي كود سابق أو انقل ترخيصًا لجهاز جديد.</p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void refresh()}
            >
              <RefreshCw size={14} /> تحديث
            </button>
          </div>
          <div className="search">
            <Search size={16} />
            <input
              aria-label="بحث في التراخيص"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث باسم العميل أو معرف الجهاز"
            />
          </div>
          {!records.length ? (
            <p className="empty-history">
              {search
                ? "لا توجد نتائج مطابقة."
                : "لم تُصدر تراخيص من هذه الخزنة بعد."}
            </p>
          ) : (
            <div className="history-list">
              {records.slice(0, 100).map((item) => (
                <article key={item.license.licenseId}>
                  <div>
                    <strong>{item.license.customer}</strong>
                    <small>
                      <bdi>{item.license.deviceId.slice(0, 19)}…</bdi> · ينتهي{" "}
                      {date(item.license.expiresAt)}
                    </small>
                  </div>
                  <span className="record-status">
                    {item.superseded
                      ? "تم استبداله"
                      : Date.parse(item.license.expiresAt) <= Date.now()
                        ? "منتهٍ"
                        : "صادر"}
                  </span>
                  <div className="history-actions">
                    <button
                      type="button"
                      disabled={busy || item.superseded}
                      onClick={() => {
                        setSelected(item);
                        setMessage("");
                      }}
                    >
                      عرض الكود
                    </button>
                    <button
                      type="button"
                      disabled={
                        busy ||
                        item.superseded ||
                        Date.parse(item.license.expiresAt) <= Date.now()
                      }
                      onClick={() => beginTransfer(item)}
                    >
                      نقل لجهاز آخر
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <p className="privacy-note">
          أداة خاصة بالإدارة · لا تُرسل هذه الأداة أو الخزنة للعميل.
        </p>
      </main>
      <footer>
        Developed by <strong>Daidar</strong>
        <span>License Manager · Offline</span>
      </footer>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
