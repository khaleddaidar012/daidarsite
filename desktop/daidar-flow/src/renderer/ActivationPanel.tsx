import { useState } from "react";
import { ArrowLeft, Copy, FileUp, KeyRound } from "lucide-react";
import type {
  ActivationResult,
  LicenseStatus,
  LicenseView,
} from "../shared/licensing";
export const statusLabels: Record<LicenseStatus, string> = {
  free: "النسخة المجانية — غير مفعّل",
  active: "الاشتراك مفعّل",
  expiring: "الاشتراك يقترب من الانتهاء",
  expired: "انتهى الاشتراك",
  "not-started": "الاشتراك لم يبدأ بعد",
  "device-mismatch": "الترخيص لا يطابق هذا الجهاز",
  "device-unavailable": "تعذر تحديد معرف الجهاز",
  invalid: "ترخيص غير صالح",
  "storage-error": "تعذر قراءة أو حفظ التفعيل بأمان",
  "clock-review": "ساعة الجهاز تحتاج إلى مراجعة",
};
export function countdown(milliseconds: number) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(total / 86400)} يوم، ${Math.floor((total % 86400) / 3600)} ساعة، ${Math.floor((total % 3600) / 60)} دقيقة، ${total % 60} ثانية`;
}
export function ActivationPanel({
  license,
  onChange,
  onBack,
}: {
  license: LicenseView;
  onChange: (value: LicenseView) => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function action(operation: () => Promise<ActivationResult | null>) {
    setBusy(true);
    setMessage("");
    try {
      const result = await operation();
      if (result) {
        setMessage(result.message);
        onChange(result.license);
        if (result.ok) setCode("");
      }
    } catch {
      setMessage("تعذر إتمام العملية. أعد المحاولة.");
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      setMessage(
        (await window.daidar.copyDeviceId())
          ? "تم نسخ معرف الجهاز. أرسله للإدارة."
          : "تعذر نسخ المعرف.",
      );
    } catch {
      setMessage("تعذر نسخ المعرف.");
    }
  }
  const date = (value?: string) =>
    value
      ? new Date(value).toLocaleString("ar-EG", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—";
  return (
    <section className="activation-panel" aria-labelledby="activation-title">
      <div className="activation-title">
        <h2 id="activation-title">
          <KeyRound size={22} /> التفعيل والاشتراك
        </h2>
        <button type="button" onClick={onBack}>
          العودة للأدوات <ArrowLeft size={16} />
        </button>
      </div>
      <div className="subscription-summary">
        <strong>{statusLabels[license.status]}</strong>
        <dl>
          <div>
            <dt>العميل</dt>
            <dd>{license.customer || "—"}</dd>
          </div>
          <div>
            <dt>بداية الاشتراك</dt>
            <dd>{date(license.startsAt)}</dd>
          </div>
          <div>
            <dt>تاريخ الانتهاء</dt>
            <dd>{date(license.expiresAt)}</dd>
          </div>
        </dl>
        {(license.status === "active" || license.status === "expiring") && (
          <p className="subscription-countdown">
            الوقت المتبقي: {countdown(license.remainingMs)}
          </p>
        )}
        {license.licenseId && (
          <p>
            رقم الترخيص: <bdi>{license.licenseId}</bdi>
          </p>
        )}
        <p>
          المميزات المجانية مستمرة دائمًا. انتهاء الاشتراك يقفل المميزات
          المدفوعة فقط، ولا يحذف أي بيانات.
        </p>
      </div>
      <label htmlFor="device-id">
        معرف جهازك — انسخه وأرسله للإدارة لإصدار الترخيص
      </label>
      <div className="device-row">
        <input
          id="device-id"
          value={license.deviceId || "المعرف غير متاح"}
          dir="ltr"
          readOnly
        />
        <button
          type="button"
          onClick={() => void copy()}
          disabled={!license.deviceId || busy}
        >
          <Copy size={16} /> نسخ المعرف
        </button>
      </div>
      {license.cachedDevice && (
        <p className="activation-help">
          يُستخدم معرف الجهاز المحفوظ مؤقتًا لتعذر قراءته الآن.
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void action(() => window.daidar.activateLicense(code));
        }}
      >
        <label htmlFor="license-code">كود التفعيل الموقّع</label>
        <textarea
          id="license-code"
          dir="ltr"
          maxLength={16384}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="DFL1.…"
          spellCheck={false}
          disabled={busy}
        />
        <div className="activation-actions">
          <button
            className="activate-primary"
            type="submit"
            disabled={busy || !code.trim()}
          >
            {busy ? "جارٍ التحقق…" : "تفعيل الكود"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void action(() => window.daidar.importLicense())}
          >
            <FileUp size={16} /> استيراد ملف ترخيص
          </button>
        </div>
      </form>
      {message && (
        <p className="activation-message" role="status">
          {message}
        </p>
      )}
      <p className="activation-help">
        عند تغيير الجهاز، أرسل المعرف الجديد للإدارة لإعادة إصدار الترخيص بنفس
        تاريخ الانتهاء. لو ظهرت مشكلة في الساعة أو التخزين، صحّح ساعة Windows
        وتواصل مع الإدارة. لا توجد حماية كاملة من التلاعب بالوقت في وضع Offline.
      </p>
    </section>
  );
}
