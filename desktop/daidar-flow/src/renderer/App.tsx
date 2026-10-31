import { brandLinks, type BrandLink } from "../shared/brand";
import { useCallback, useEffect, useState } from "react";
import {
  LayoutGrid,
  Info,
  X,
  Package,
  ShoppingCart,
  Monitor,
  ArrowLeft,
  Lock,
  ChartColumn,
  Truck,
  Users,
  ShieldCheck,
  CloudUpload,
  Facebook,
  Globe,
  ExternalLink,
} from "lucide-react";
import type { FeatureId } from "../shared/features";
import type { AppInfo } from "../shared/contracts";
import type { LicenseView } from "../shared/licensing";
import { ActivationPanel, countdown, statusLabels } from "./ActivationPanel";
import Inventory from "./Inventory";
const icons: Record<string, typeof Package> = {
  Package,
  ShoppingCart,
  Monitor,
  ChartColumn,
  Truck,
  Users,
  ShieldCheck,
  CloudUpload,
};
export default function App() {
  const [license, setLicense] = useState<LicenseView | null>(null);
  const [activationOpen, setActivationOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const closeInventory = useCallback(() => setInventoryOpen(false), []);
  const [licenseRefreshError, setLicenseRefreshError] = useState(false);
  async function openBrand(id: BrandLink) {
    try {
      const opened = await window.daidar.openBrandLink(id);
      if (!opened)
        setFeedback({
          title: "تعذر فتح الرابط",
          text: "حاول مرة أخرى عند توفر متصفح واتصال بالإنترنت.",
        });
    } catch {
      setFeedback({ title: "تعذر فتح الرابط", text: "أعد المحاولة من فضلك." });
    }
  }
  const [feedback, setFeedback] = useState<{
    title: string;
    text: string;
  } | null>(null);
  async function openFeature(id: FeatureId) {
    try {
      const result = await window.daidar.openFeature(id);
      if (id === "inventory" && result.status === "coming-soon") {
        setInventoryOpen(true);
        setActivationOpen(false);
        setFeedback(null);
        return;
      }
      setFeedback({
        title: result.title || "دعيدر فلو",
        text:
          result.status === "locked"
            ? "هذه الميزة تتطلب ترقية. افتح التفعيل والاشتراك وأدخل ترخيصًا ساريًا يشمل الميزة."
            : result.status === "coming-soon"
              ? "قريبًا — وظائف هذه الأداة قيد التجهيز للمرحلة القادمة."
              : "الأداة غير متاحة.",
      });
    } catch {
      setFeedback({ title: "تعذر فتح الأداة", text: "حاول مرة أخرى." });
    }
  }

  const [info, setInfo] = useState<AppInfo | null>(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setError("");
    window.daidar
      .getAppInfo()
      .then((value) => {
        if (alive) setInfo(value);
      })
      .catch(() => {
        if (alive) setError("تعذر تهيئة مساحة العمل. حاول مرة أخرى.");
        void window.daidar.ready();
      });
    return () => {
      alive = false;
    };
  }, [attempt]);
  useEffect(() => {
    if (info) void document.fonts.ready.then(() => window.daidar.ready());
  }, [info]);
  useEffect(() => {
    if (!info) return;
    let alive = true,
      pending = false;
    async function refresh() {
      if (pending) return;
      pending = true;
      try {
        const value = await window.daidar.getLicense();
        if (alive) {
          setLicense(value);
          setLicenseRefreshError(false);
        }
      } catch {
        if (alive) {
          setLicenseRefreshError(true);
          setLicense((previous) => ({
            ...(previous ?? info!.license),
            status: "storage-error",
            paidFeatures: [],
            remainingMs: 0,
          }));
        }
      } finally {
        pending = false;
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 1000);
    window.addEventListener("focus", refresh);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [info]);
  if (!info)
    return (
      <main className="startup-state">
        <img src="./logo.png" alt="شعار دعيدر" />
        <p role="status">{error || "جارٍ تهيئة مساحة العمل…"}</p>
        {error && (
          <button onClick={() => setAttempt((value) => value + 1)}>
            إعادة المحاولة
          </button>
        )}
      </main>
    );
  const currentLicense = license ?? info.license;
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <img src="./logo.png" alt="شعار Daidar Solutions" />
          <div>
            <h1>دعيدر فلو</h1>
            <small lang="en">DAIDAR FLOW</small>
          </div>
        </div>
        <div className="header-meta">
          <span className="offline">
            <i />
            يعمل بدون إنترنت
          </span>
          <span className="edition">
            {currentLicense.paidFeatures.length
              ? "النسخة المفعّلة"
              : "النسخة المجانية"}
          </span>
          <button
            type="button"
            className="activation-nav"
            onClick={() => setActivationOpen((value) => !value)}
          >
            التفعيل والاشتراك
          </button>
        </div>
      </header>
      <main className="dashboard">
        <div className="dashboard-inner">
          {(licenseRefreshError ||
            [
              "expiring",
              "expired",
              "clock-review",
              "storage-error",
              "device-mismatch",
              "device-unavailable",
              "invalid",
            ].includes(currentLicense.status)) && (
            <div className="license-alert" role="status">
              <div>
                <strong>
                  {licenseRefreshError
                    ? "تعذر تحديث حالة الاشتراك"
                    : statusLabels[currentLicense.status]}
                </strong>
                <p>
                  {currentLicense.status === "expiring"
                    ? `باقي ${countdown(currentLicense.remainingMs)}. جدّد قبل انتهاء الاشتراك.`
                    : "المميزات المجانية مستمرة. راجع تفاصيل التفعيل أو تواصل مع الإدارة."}
                </p>
              </div>
              <button type="button" onClick={() => setActivationOpen(true)}>
                تفاصيل الاشتراك
              </button>
            </div>
          )}
          {activationOpen ? (
            <ActivationPanel
              license={currentLicense}
              onChange={setLicense}
              onBack={() => setActivationOpen(false)}
            />
          ) : inventoryOpen ? (
            <Inventory onBack={closeInventory} />
          ) : (
            <>
              <div className="intro">
                <div>
                  <p className="eyebrow">مساحة عملك، ببساطة</p>
                  <h2>أهلًا بك في دعيدر فلو</h2>
                  <p>إدارة المبيعات والمخزون والكاشير، من مكان واحد.</p>
                </div>
                <span className="workspace-symbol" aria-hidden="true">
                  <LayoutGrid size={27} />
                </span>
              </div>
              <div className="section-heading">
                <h3>أدوات نشاطك</h3>
                <p>ابدأ بالأساسيات، ووسّع أدواتك مع نمو شغلك.</p>
              </div>
              <div className="feature-grid" aria-label="أدوات دعيدر فلو">
                {info.features.map((feature) => {
                  const Icon = icons[feature.icon] || Package;
                  const locked =
                    feature.tier === "paid" &&
                    !currentLicense.paidFeatures.includes(feature.id);
                  return (
                    <article
                      className={`feature-card ${locked ? "is-locked" : ""}`}
                      key={feature.id}
                      data-feature={feature.id}
                    >
                      <div className="feature-card-top">
                        <span className="feature-icon">
                          <Icon aria-hidden="true" />
                        </span>
                        <span className="feature-status">
                          {locked && <Lock size={10} aria-hidden="true" />}
                          {locked ? "يتطلب ترقية" : "متاح"}
                        </span>
                      </div>
                      <h4>{feature.title}</h4>
                      <p>{feature.description}</p>
                      <button
                        type="button"
                        className="feature-action"
                        aria-label={`${locked ? "الترقية للاستخدام" : "فتح"} — ${feature.title}`}
                        onClick={() => void openFeature(feature.id)}
                      >
                        {locked ? (
                          <Lock size={12} aria-hidden="true" />
                        ) : (
                          <ArrowLeft size={13} aria-hidden="true" />
                        )}
                        {locked ? "الترقية للاستخدام" : "فتح الأداة"}
                      </button>
                    </article>
                  );
                })}
              </div>
              <p className="phase-note">
                <Info size={15} />
                <span>
                  المخزون جاهز لإدارة منتجاتك. باقي الأدوات ستُضاف في المراحل
                  القادمة.
                </span>
              </p>
            </>
          )}
        </div>
      </main>
      <footer className="app-footer">
        <span className="footer-brand">
          Developed by <strong>Daidar</strong>
        </span>
        <nav className="footer-links" aria-label="روابط الشركة">
          <a
            href={brandLinks.facebook}
            onClick={(event) => {
              event.preventDefault();
              void openBrand("facebook");
            }}
          >
            <Facebook size={12} aria-hidden="true" />
            Facebook
            <ExternalLink size={10} aria-hidden="true" />
          </a>
          <a
            href={brandLinks.website}
            onClick={(event) => {
              event.preventDefault();
              void openBrand("website");
            }}
          >
            <Globe size={12} aria-hidden="true" />
            Website
            <ExternalLink size={10} aria-hidden="true" />
          </a>
        </nav>
        <span className="footer-version">v{info.version}</span>
      </footer>
      {feedback && (
        <div className="feedback" role="status">
          <div>
            <strong>{feedback.title}</strong>
            <p>{feedback.text}</p>
          </div>
          <button
            type="button"
            aria-label="إغلاق الرسالة"
            onClick={() => setFeedback(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
