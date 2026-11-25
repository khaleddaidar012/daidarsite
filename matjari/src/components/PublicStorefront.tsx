import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, Phone, ArrowRight, Sparkles, Plus, Check, Globe } from 'lucide-react';
import { Store, Product, CartItem, StoreThemeId } from '../types';
import { Footer } from './Footer';
import { UpgradeBanner } from './UpgradeBanner';
import FloatingWhatsAppButton from '../../../shared/FloatingWhatsAppButton';
import { buildStoreWhatsAppUrl } from '../../../shared/whatsapp';
import { resolveStoreThemeId } from '../../../shared/store-themes';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

interface PublicStorefrontProps {
  store: Store | null;
  products: Product[];
  cart: CartItem[];
  onAddToCart: (product: Product) => void;
  onOpenCart: () => void;
  onBackToDashboard: () => void;
  onUpgradeClick?: () => void;
  previewMode?: boolean;
  themeOverride?: StoreThemeId;
  embeddedPreview?: boolean;
}

const FALLBACK_PRODUCT_SVG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#e2e8f0"/><path d="M140 165h120l-12 95H152z" fill="#94a3b8"/><path d="M170 165a30 30 0 0 1 60 0" fill="none" stroke="#64748b" stroke-width="10" stroke-linecap="round"/></svg>'
  );

export const PublicStorefront: React.FC<PublicStorefrontProps> = ({
  store,
  products,
  cart,
  onAddToCart,
  onOpenCart,
  onBackToDashboard,
  onUpgradeClick,
  previewMode = false,
  themeOverride,
  embeddedPreview = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { t, toggleLang, isArabic } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>(t('all'));
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addedAnimationId, setAddedAnimationId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCategory(t('all'));
  }, [isArabic, t]);

  useEffect(() => {
    if (store?.id && !embeddedPreview) {
      api.recordVisit('متصفح واجهة المتجر', store.id);
    }
  }, [store?.id, embeddedPreview]);

  const activeTheme: StoreThemeId = resolveStoreThemeId(themeOverride ?? store?.theme_id);
  const isTech = activeTheme === 'tech';
  const isMinimal = activeTheme === 'minimal';
  const isBoutique = activeTheme === 'boutique';
  const isCatalog = activeTheme === 'catalog';

  const currency = store?.currency || (isArabic ? 'ج.م' : '$');
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const phone = store?.whatsapp_number?.trim() || '';
  const displayPhone = phone.startsWith('+') || phone.startsWith('0') ? phone : `+${phone}`;
  const storeWhatsAppMessage = isArabic
    ? store?.name
      ? `مرحبًا، أرغب في الاستفسار عن منتجات متجر ${store.name}`
      : 'مرحبًا، أرغب في الاستفسار عن منتجات المتجر'
    : store?.name
      ? `Hello, I have a question about ${store.name}`
      : 'Hello, I have a question about your store';
  const storeWhatsAppHref = buildStoreWhatsAppUrl(store?.whatsapp_number, storeWhatsAppMessage);
  const storeStatus = store?.effective_status || (store?.is_active === 1 ? 'active' : 'awaiting_activation');
  const canOrder = embeddedPreview ? true : !!store && ['active', 'trial'].includes(storeStatus);
  const needsUpgrade =
    !embeddedPreview &&
    !!store &&
    (typeof store.needs_upgrade === 'boolean' ? store.needs_upgrade : store.is_paid_subscription === false || !canOrder);

  const handleUpgradeClick = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
      return;
    }
    window.location.assign(`/${isArabic ? 'ar' : 'en'}/hub/stores/?view=store_owner&tab=subscription`);
  };

  const upgradeSubtitle = !canOrder
    ? storeStatus === 'expired'
      ? isArabic
        ? 'الاشتراك منتهي؛ المتجر لا يستقبل طلبات حاليًا'
        : 'Subscription expired; this store is not accepting orders'
      : isArabic
        ? 'هذا المتجر على الباقة المجانية وغير مفعّل لاستقبال الطلبات حاليًا'
        : 'This store is on the Free Plan and cannot receive orders yet'
    : isArabic
      ? 'هذا المتجر يعمل حاليًا على الباقة المجانية'
      : 'This store is currently on the Free Plan';

  const defaultLogo = `${import.meta.env.BASE_URL}store-mark.svg`;
  const logoSrc = store?.logo_data || defaultLogo;
  const fallbackCategory = isArabic ? 'عام' : 'General';
  const categories = [t('all'), ...Array.from(new Set(products.map((p) => p.category || fallbackCategory)))];
  const categoryCounts = categories.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = cat === t('all') ? products.length : products.filter((p) => (p.category || fallbackCategory) === cat).length;
    return acc;
  }, {});

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === t('all') || (p.category || fallbackCategory) === selectedCategory;
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const handleAdd = (p: Product) => {
    if (!canOrder) return;
    onAddToCart(p);
    setAddedAnimationId(p.id);
    window.setTimeout(() => setAddedAnimationId(null), 1200);
  };

  const formatPrice = (price: number) =>
    Number(price).toLocaleString(isArabic ? 'ar-EG' : 'en-US', {
      minimumFractionDigits: Number.isInteger(Number(price)) ? 0 : 2,
      maximumFractionDigits: 2,
    });

  // Theme-scoped surface tokens (strictly isolated under [data-store-theme])
  const shellClass = isTech
    ? 'bg-[#090d16] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-100'
    : isMinimal
      ? 'bg-[#fafaf9] text-zinc-900 selection:bg-zinc-900 selection:text-white'
      : isBoutique
        ? 'bg-[#fdf8f3] text-stone-900 selection:bg-amber-200 selection:text-stone-950'
        : isCatalog
          ? 'bg-slate-100 text-slate-900 selection:bg-emerald-100 selection:text-emerald-950'
          : 'bg-[#f7fafe] text-slate-800 selection:bg-sky-100 selection:text-sky-900';

  const headerClass = isTech
    ? 'bg-[#0f1624]/95 border-b border-slate-800'
    : isMinimal
      ? 'bg-white/95 border-b border-zinc-200'
      : isBoutique
        ? 'bg-[#fffaf4]/95 border-b border-amber-900/10'
        : isCatalog
          ? 'bg-white border-b-2 border-emerald-600/20'
          : 'bg-white/95 border-b border-slate-100 shadow-2xs';

  const cartButtonClass = isTech
    ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20 rounded-xl'
    : isMinimal
      ? 'bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg'
      : isBoutique
        ? 'bg-[#9a3412] hover:bg-[#7c2d12] text-amber-50 rounded-full shadow-md shadow-amber-950/15'
        : isCatalog
          ? 'bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/20'
          : 'bg-[#0084d6] hover:bg-[#0074bd] text-white rounded-2xl shadow-lg shadow-sky-600/25';

  const cartCountBadgeClass = isTech
    ? 'bg-slate-950 text-cyan-300'
    : isMinimal
      ? 'bg-white text-zinc-900'
      : isBoutique
        ? 'bg-amber-50 text-[#9a3412]'
        : isCatalog
          ? 'bg-white text-emerald-700'
          : 'bg-white text-[#0084d6]';

  const gridClass = isMinimal
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8'
    : isBoutique
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7'
      : isCatalog
        ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4'
        : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6';

  const mediaAspectClass = isMinimal
    ? 'aspect-[4/5]'
    : isBoutique
      ? 'aspect-[3/4]'
      : isCatalog
        ? 'aspect-[4/3]'
        : 'aspect-square';

  return (
    <div
      dir={isArabic ? 'rtl' : 'ltr'}
      data-store-theme={activeTheme}
      className={`min-h-screen flex flex-col justify-between font-cairo transition-colors ${shellClass}`}
    >
      {/* 1. TOP BANNERS & NAVBAR */}
      <header className={`${embeddedPreview ? 'relative' : 'sticky top-0'} z-30 backdrop-blur-md transition-colors ${headerClass}`}>
        {store && needsUpgrade && (
          <UpgradeBanner
            compact
            isArabic={isArabic}
            onAction={handleUpgradeClick}
            subtitle={upgradeSubtitle}
            actionLabel={isArabic ? 'الاشتراك والترقية' : 'Subscribe & upgrade'}
          />
        )}

        {previewMode && !embeddedPreview && (
          <div className="bg-[#0e1f38] text-sky-200 text-xs py-2 px-3 sm:px-6 border-b border-sky-950">
            <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-bold text-[11px] sm:text-xs truncate max-w-[210px] sm:max-w-none">
                <Sparkles className="w-3.5 h-3.5 text-[#00b4d8] shrink-0" />
                <span className="truncate">{isArabic ? 'معاينة المتجر' : 'Store preview'}</span>
              </span>
              <button
                type="button"
                onClick={onBackToDashboard}
                className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white hover:text-[#00b4d8] font-black flex items-center gap-1 text-[11px] transition-all shrink-0 whitespace-nowrap cursor-pointer"
                title={isArabic ? 'العودة للوحة التحكم' : 'Return to dashboard'}
              >
                <span>{isArabic ? 'العودة للوحة التحكم' : 'Back to dashboard'}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${isArabic ? '' : 'rotate-180'}`} />
              </button>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logoSrc}
              alt={store?.name || 'Store Logo'}
              className={`w-10 h-10 sm:w-11 sm:h-11 object-contain shrink-0 p-1 ${
                isTech
                  ? 'rounded-xl bg-slate-900 border border-slate-700'
                  : isMinimal
                    ? 'rounded-lg bg-zinc-50 border border-zinc-200'
                    : isBoutique
                      ? 'rounded-full bg-white border border-amber-900/20 shadow-xs'
                      : isCatalog
                        ? 'rounded-xl bg-emerald-50 border border-emerald-200'
                        : 'rounded-2xl bg-white border border-slate-200 shadow-xs'
              }`}
            />
            <div className="min-w-0">
              <h1
                className={`text-sm sm:text-lg font-black leading-tight truncate max-w-[160px] sm:max-w-xs md:max-w-md ${
                  isTech
                    ? 'text-white tracking-tight'
                    : isMinimal
                      ? 'text-zinc-900 tracking-wide'
                      : isBoutique
                        ? 'text-stone-900'
                        : 'text-[#0e1f38]'
                }`}
              >
                {store?.name || t('daidar_solutions')}
              </h1>
              <p
                className={`text-[11px] mt-0.5 truncate hidden sm:block font-medium ${
                  isTech
                    ? 'text-cyan-400/90'
                    : isMinimal
                      ? 'text-zinc-500'
                      : isBoutique
                        ? 'text-amber-900/70'
                        : isCatalog
                          ? 'text-emerald-700'
                          : 'text-slate-500'
                }`}
              >
                {store?.activity_type || t('cloud_store_mgmt')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!embeddedPreview && (
              <button
                type="button"
                onClick={toggleLang}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  isTech
                    ? 'text-slate-200 border-slate-700 hover:bg-slate-800'
                    : isMinimal
                      ? 'text-zinc-700 border-zinc-200 hover:bg-zinc-100 rounded-lg'
                      : isBoutique
                        ? 'text-stone-800 border-amber-900/15 hover:bg-amber-100/50 rounded-full'
                        : 'text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Globe className={`w-3.5 h-3.5 ${isTech ? 'text-cyan-400' : isBoutique ? 'text-[#9a3412]' : isCatalog ? 'text-emerald-600' : isMinimal ? 'text-zinc-700' : 'text-[#0084d6]'}`} />
                <span>{t('lang_switch')}</span>
              </button>
            )}

            <button
              type="button"
              disabled={!canOrder}
              onClick={onOpenCart}
              className={`relative inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 font-extrabold text-xs sm:text-sm active:scale-95 transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${cartButtonClass}`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">{t('shopping_cart')}</span>
              <span className={`font-black text-xs px-2 py-0.5 rounded-full ${cartCountBadgeClass}`}>
                {totalCartCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. THEME-SPECIFIC HERO SECTION */}
      {isMinimal ? (
        <section className="bg-white border-b border-zinc-200 py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span className="inline-block text-[11px] font-bold tracking-widest uppercase text-zinc-500 border-b border-zinc-300 pb-1">
              {store?.activity_type || t('shop_safe')}
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-zinc-950 tracking-tight leading-tight">
              {store?.name || t('platform_name')}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 leading-7 max-w-xl mx-auto">
              {store?.bio ||
                (isArabic
                  ? 'مجموعة مختارة من المنتجات بتجربة تصفح هادئة وطلب مباشر وسريع.'
                  : 'Curated products with a calm browsing experience and direct ordering.')}
            </p>
            {phone && (
              <div className="pt-2">
                <a
                  href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2 text-xs font-bold text-zinc-800 hover:bg-zinc-900 hover:text-white transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span dir="ltr" className="font-mono">
                    {displayPhone}
                  </span>
                </a>
              </div>
            )}
          </div>
        </section>
      ) : isBoutique ? (
        <section className="py-7 sm:py-10 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto rounded-[2rem] border border-amber-900/15 bg-gradient-to-br from-[#f8efe5] via-[#fdf8f3] to-[#f4e4d4] p-6 sm:p-10 shadow-sm">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-white border-2 border-amber-900/20 p-2 shadow-sm flex items-center justify-center">
                <img src={logoSrc} alt={store?.name || 'Store'} className="w-full h-full object-contain rounded-full" />
              </div>
              <span className="inline-block text-[11px] font-extrabold text-[#9a3412] bg-white/80 px-4 py-1 rounded-full border border-amber-900/15">
                {store?.activity_type || t('shop_safe')}
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight">
                {t('welcome_to')} {store?.name || t('platform_name')}
              </h2>
              <p className="text-xs sm:text-sm text-stone-700 leading-7 max-w-2xl mx-auto">
                {store?.bio ||
                  (isArabic
                    ? 'تشكيلة منتقاة بعناية لتجربة تسوق أنيقة وطلب مباشر بسهولة.'
                    : 'Carefully curated pieces for an elevated shopping experience.')}
              </p>
              {phone && (
                <a
                  href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                  className="inline-flex items-center gap-2 rounded-full bg-[#9a3412] text-amber-50 px-5 py-2.5 text-xs font-bold hover:bg-[#7c2d12] transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span dir="ltr" className="font-mono">
                    {displayPhone}
                  </span>
                </a>
              )}
            </div>
          </div>
        </section>
      ) : isTech ? (
        <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-b from-[#0f172a] to-[#090d16] py-8 sm:py-11 px-4 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(6,182,212,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(6,182,212,0.18) 1px, transparent 1px)',
              backgroundSize: '36px 36px',
            }}
          />
          <div className="relative max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-cyan-300 bg-cyan-950/70 px-3 py-1 rounded-lg border border-cyan-500/30">
                  <span>{store?.activity_type || t('shop_safe')}</span>
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-400">
                  {products.length.toLocaleString(isArabic ? 'ar-EG' : 'en-US')} {isArabic ? 'منتج متاح' : 'items'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {store?.name || t('platform_name')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {store?.bio ||
                  (isArabic
                    ? 'تصفح المواصفات والأسعار بوضوح، وأضف منتجاتك للسلة لإتمام الطلب مباشرة.'
                    : 'Browse specs and prices clearly, then add to cart for fast direct ordering.')}
              </p>
            </div>
            {phone && (
              <a
                href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                className="flex items-center gap-3 bg-[#111827] px-4 py-3.5 rounded-2xl border border-slate-700 hover:border-cyan-500/60 transition-colors shrink-0"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="text-start">
                  <span className="text-[10px] text-slate-400 block font-bold">{t('support_inquiry')}</span>
                  <span dir="ltr" className="text-sm font-black text-white font-mono block">
                    {displayPhone}
                  </span>
                </div>
              </a>
            )}
          </div>
        </section>
      ) : isCatalog ? (
        <section className="bg-white border-b border-slate-200 py-4 sm:py-5 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-2xl font-black text-slate-900 truncate">
                  {store?.name || t('platform_name')}
                </h2>
                <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700">
                  {products.length.toLocaleString(isArabic ? 'ar-EG' : 'en-US')} {isArabic ? 'منتج' : 'products'}
                </span>
              </div>
              {store?.bio && <p className="mt-1 text-xs text-slate-600 line-clamp-2 max-w-2xl">{store.bio}</p>}
            </div>
            {phone && (
              <a
                href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                className="inline-flex items-center gap-2 self-start sm:self-center rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2 text-xs font-extrabold text-emerald-800 hover:bg-emerald-100 shrink-0"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-700" />
                <span dir="ltr" className="font-mono">
                  {displayPhone}
                </span>
              </a>
            )}
          </div>
        </section>
      ) : (
        <section className="bg-gradient-to-b from-white to-[#f7fafe] border-b border-slate-200/80 py-8 sm:py-10 px-4 sm:px-6 lg:px-8 transition-colors">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-2">
              <span className="inline-block text-xs font-black text-[#0084d6] bg-[#e6f4fe] px-3.5 py-1 rounded-full border border-sky-200/70">
                {t('shop_safe')} • {t('whatsapp_order')}
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-[#0e1f38] tracking-tight">
                {t('welcome_to')} {store?.name || t('platform_name')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                {store?.bio ||
                  (isArabic
                    ? 'تصفح أحدث المنتجات والخدمات الحصرية، واطلب مباشرة عبر تطبيق واتساب بخطوة واحدة سهلة وسريعة.'
                    : 'Browse the latest products and order directly via WhatsApp in one simple step.')}
              </p>
            </div>

            {phone && (
              <a
                href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                aria-label={`${t('support_inquiry')} ${displayPhone}`}
                className="flex items-center gap-3 bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-2xl shadow-sky-500/5 shrink-0 transition-all hover:border-sky-300 hover:shadow-sky-500/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 cursor-pointer"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#e6f4fe] text-[#0084d6] flex items-center justify-center font-bold">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="text-start">
                  <span className="text-[10px] text-slate-400 block font-bold">{t('support_inquiry')}</span>
                  <span dir="ltr" className="text-sm font-black text-[#0e1f38] font-mono block transition-colors">
                    {displayPhone}
                  </span>
                </div>
              </a>
            )}
          </div>
        </section>
      )}

      {/* 3. MAIN CATALOG SECTION */}
      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 space-y-6 ${isCatalog ? 'py-5' : 'py-8'}`}>
        {/* Search & Filters Bar */}
        <div
          className={`flex flex-col ${isCatalog ? 'md:flex-row-reverse' : 'md:flex-row'} items-stretch md:items-center justify-between gap-4 ${
            isMinimal ? 'border-b border-zinc-200 pb-4' : ''
          }`}
        >
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {categories.map((cat) => {
              const selected = selectedCategory === cat;
              const pillClass = isTech
                ? selected
                  ? 'bg-cyan-500 text-slate-950 rounded-xl shadow-md shadow-cyan-500/20'
                  : 'bg-[#111827] text-slate-300 hover:text-white border border-slate-800 rounded-xl'
                : isMinimal
                  ? selected
                    ? 'border-b-2 border-zinc-900 text-zinc-950 rounded-none bg-transparent px-3'
                    : 'text-zinc-500 hover:text-zinc-900 rounded-none bg-transparent px-3'
                  : isBoutique
                    ? selected
                      ? 'bg-[#9a3412] text-amber-50 rounded-full shadow-sm'
                      : 'bg-white text-stone-700 hover:bg-amber-50 border border-amber-900/15 rounded-full'
                    : isCatalog
                      ? selected
                        ? 'bg-emerald-600 text-white rounded-lg shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-emerald-50 border border-slate-200 rounded-lg'
                      : selected
                        ? 'bg-[#0084d6] text-white rounded-full shadow-md shadow-sky-600/25'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-full';

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 text-xs font-black whitespace-nowrap transition-all cursor-pointer inline-flex items-center gap-1.5 ${pillClass}`}
                >
                  <span>{cat}</span>
                  {isCatalog && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        selected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {categoryCounts[cat] || 0}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="relative min-w-[240px] md:w-80">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isArabic ? 'ابحث عن منتج بالاسم...' : 'Search product by name...'}
              className={`w-full px-4 py-2.5 text-xs font-medium transition-all ${
                isTech
                  ? 'rounded-xl border border-slate-700 bg-[#111827] text-slate-100 placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30'
                  : isMinimal
                    ? 'rounded-lg border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900'
                    : isBoutique
                      ? 'rounded-full border border-amber-900/20 bg-white text-stone-900 placeholder:text-stone-400 focus:border-[#9a3412]'
                      : isCatalog
                        ? 'rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100'
                        : 'rounded-2xl border border-slate-200 bg-white text-slate-800 focus:border-[#0084d6] focus:ring-4 focus:ring-sky-100 shadow-2xs'
              }`}
            />
            <Search
              className={`w-4 h-4 absolute ${isArabic ? 'left-3.5' : 'right-3.5'} top-3 ${
                isTech ? 'text-slate-400' : 'text-slate-400'
              }`}
            />
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div
            className={`rounded-3xl border border-dashed p-12 text-center ${
              isTech
                ? 'bg-[#111827] border-slate-700 text-slate-300'
                : isMinimal
                  ? 'bg-white border-zinc-300 text-zinc-700 rounded-xl'
                  : isBoutique
                    ? 'bg-white border-amber-900/20 text-stone-700'
                    : 'bg-white border-slate-300 text-slate-700'
            }`}
          >
            <ShoppingBag className={`w-12 h-12 mx-auto mb-3 ${isTech ? 'text-slate-600' : 'text-slate-300'}`} />
            <h3 className="text-base font-bold">
              {products.length === 0
                ? isArabic
                  ? 'لا توجد منتجات مضافة في هذا المتجر بعد'
                  : 'No products added to this store yet'
                : isArabic
                  ? 'لا توجد منتجات تطابق بحثك'
                  : 'No products match your search'}
            </h3>
            <p className={`text-xs mt-1 ${isTech ? 'text-slate-400' : 'text-slate-500'}`}>
              {products.length === 0
                ? isArabic
                  ? 'سيتم عرض المنتجات هنا بمجرد إضافتها من لوحة التحكم.'
                  : 'Products will appear here as soon as they are added from the dashboard.'
                : isArabic
                  ? 'جرب البحث بكلمة أخرى أو اختر تصنيفاً مختلفاً.'
                  : 'Try another search term or filter.'}
            </p>
          </div>
        ) : (
          <div className={gridClass}>
            {filteredProducts.map((p) => {
              const isAdded = addedAnimationId === p.id;
              const imgSrc = p.image_data || FALLBACK_PRODUCT_SVG;

              const cardClass = isTech
                ? 'bg-[#111827] rounded-2xl border border-slate-800 hover:border-cyan-500/50 shadow-lg shadow-black/20'
                : isMinimal
                  ? 'bg-white rounded-lg border border-zinc-200 hover:border-zinc-400'
                  : isBoutique
                    ? 'bg-white rounded-2xl border border-amber-900/15 hover:shadow-xl shadow-sm'
                    : isCatalog
                      ? 'bg-white rounded-xl border border-slate-200 hover:border-emerald-400 shadow-2xs'
                      : 'bg-white rounded-3xl border border-slate-200/90 shadow-2xl shadow-sky-500/5 hover:shadow-xl';

              const addBtnClass = isAdded
                ? 'bg-slate-900 text-white'
                : isTech
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl'
                  : isMinimal
                    ? 'bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg'
                    : isBoutique
                      ? 'bg-[#9a3412] hover:bg-[#7c2d12] text-amber-50 rounded-full'
                      : isCatalog
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg w-full justify-center'
                        : 'bg-[#e6f4fe] text-[#0084d6] hover:bg-[#0084d6] hover:text-white border border-sky-200 rounded-2xl';

              return (
                <article
                  key={p.id}
                  className={`overflow-hidden transition-all flex flex-col justify-between group ${cardClass}`}
                >
                  <div
                    onClick={() => setSelectedProduct(p)}
                    className={`relative ${mediaAspectClass} w-full cursor-pointer overflow-hidden ${
                      isTech ? 'bg-slate-900' : isBoutique ? 'bg-[#f6ede2]' : 'bg-slate-100'
                    }`}
                  >
                    <img
                      src={imgSrc}
                      alt={p.name}
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_PRODUCT_SVG;
                      }}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />

                    {p.category && (
                      <span
                        className={`absolute top-2.5 ${isArabic ? 'right-2.5' : 'left-2.5'} text-[10px] font-black px-2.5 py-1 backdrop-blur-md ${
                          isTech
                            ? 'bg-slate-950/85 text-cyan-300 border border-cyan-500/30 rounded-md'
                            : isMinimal
                              ? 'bg-white/90 text-zinc-900 rounded-sm'
                              : isBoutique
                                ? 'bg-[#fdf8f3]/90 text-stone-900 rounded-full'
                                : 'bg-[#0e1f38]/80 text-white rounded-full'
                        }`}
                      >
                        {p.category}
                      </span>
                    )}

                    {isBoutique && (
                      <span
                        className={`absolute bottom-2.5 ${isArabic ? 'left-2.5' : 'right-2.5'} rounded-full bg-white/95 px-3 py-1 text-xs font-black text-[#9a3412] shadow-sm font-mono`}
                      >
                        {formatPrice(p.price)} {currency}
                      </span>
                    )}
                  </div>

                  <div className={`${isCatalog ? 'p-3' : 'p-4 sm:p-5'} flex-1 flex flex-col justify-between`}>
                    <div>
                      <h3
                        onClick={() => setSelectedProduct(p)}
                        className={`font-extrabold ${isCatalog ? 'text-xs sm:text-sm' : 'text-sm'} leading-snug line-clamp-2 cursor-pointer transition-colors ${
                          isTech
                            ? 'text-white hover:text-cyan-300'
                            : isMinimal
                              ? 'text-zinc-900 hover:text-zinc-600'
                              : isBoutique
                                ? 'text-stone-900 hover:text-[#9a3412]'
                                : 'text-[#0e1f38] hover:text-[#0084d6]'
                        }`}
                      >
                        {p.name}
                      </h3>
                      {!isCatalog && (
                        <p
                          className={`text-xs line-clamp-2 mt-1 leading-relaxed font-medium ${
                            isTech ? 'text-slate-400' : isMinimal ? 'text-zinc-500' : isBoutique ? 'text-stone-600' : 'text-slate-500'
                          }`}
                        >
                          {p.description || (isArabic ? 'جودة ممتازة وضمان كامل.' : 'High quality and satisfaction guaranteed.')}
                        </p>
                      )}
                    </div>

                    <div
                      className={`pt-3 mt-3 border-t ${
                        isTech ? 'border-slate-800' : isMinimal ? 'border-zinc-100' : isBoutique ? 'border-amber-900/10' : 'border-slate-100'
                      } ${isCatalog ? 'space-y-2.5' : 'flex items-center justify-between gap-2'}`}
                    >
                      {!isBoutique && (
                        <div>
                          {!isCatalog && (
                            <span className={`text-[10px] block font-bold ${isTech ? 'text-slate-400' : 'text-slate-400'}`}>
                              {t('price_label')}
                            </span>
                          )}
                          <span
                            className={`text-base sm:text-lg font-black font-mono ${
                              isTech
                                ? 'text-cyan-400'
                                : isMinimal
                                  ? 'text-zinc-950'
                                  : isCatalog
                                    ? 'text-emerald-700'
                                    : 'text-[#0084d6]'
                            }`}
                          >
                            {formatPrice(p.price)}{' '}
                            <span className={`text-[11px] font-extrabold ${isTech ? 'text-slate-300' : 'text-slate-600'}`}>
                              {currency}
                            </span>
                          </span>
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={!canOrder}
                        onClick={() => handleAdd(p)}
                        className={`px-3.5 py-2.5 text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                          isBoutique ? 'w-full justify-center' : ''
                        } ${addBtnClass}`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>{t('added')}</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>{t('add_to_cart')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-cairo">
          <div
            className={`rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border animate-fadeIn ${
              isTech ? 'bg-[#111827] border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className={`relative aspect-4/3 w-full ${isTech ? 'bg-slate-900' : 'bg-slate-100'}`}>
              <img
                src={selectedProduct.image_data || FALLBACK_PRODUCT_SVG}
                alt={selectedProduct.name}
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_PRODUCT_SVG;
                }}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                aria-label={isArabic ? 'إغلاق' : 'Close'}
                className={`absolute top-3 ${isArabic ? 'left-3' : 'right-3'} w-8 h-8 rounded-full bg-white/90 text-slate-800 flex items-center justify-center hover:bg-white font-bold cursor-pointer`}
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-xs font-black px-3 py-1 rounded-full ${
                    isTech ? 'bg-cyan-950 text-cyan-300' : isBoutique ? 'bg-amber-100 text-[#9a3412]' : isCatalog ? 'bg-emerald-50 text-emerald-700' : 'bg-[#e6f4fe] text-[#0084d6]'
                  }`}
                >
                  {selectedProduct.category || fallbackCategory}
                </span>
                <span className={`text-xl font-black font-mono ${isTech ? 'text-cyan-400' : isBoutique ? 'text-[#9a3412]' : isCatalog ? 'text-emerald-700' : 'text-[#0084d6]'}`}>
                  {formatPrice(selectedProduct.price)} {currency}
                </span>
              </div>

              <h3 className="text-lg font-black">{selectedProduct.name}</h3>
              <p className={`text-xs leading-relaxed font-medium ${isTech ? 'text-slate-300' : 'text-slate-600'}`}>
                {selectedProduct.description || (isArabic ? 'منتج مميز بأعلى معايير الجودة.' : 'Premium product made with the highest quality standards.')}
              </p>

              <div className={`pt-4 border-t flex items-center gap-3 ${isTech ? 'border-slate-800' : 'border-slate-100'}`}>
                <button
                  type="button"
                  disabled={!canOrder}
                  onClick={() => {
                    handleAdd(selectedProduct);
                    setSelectedProduct(null);
                  }}
                  className={`flex-1 py-3.5 font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${cartButtonClass}`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{t('add_to_cart')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Button for Quick Mobile Access */}
      {!embeddedPreview && totalCartCount > 0 && (
        <div className={`fixed bottom-6 ${isArabic ? 'left-6' : 'right-6'} z-40`}>
          <button
            type="button"
            disabled={!canOrder}
            onClick={onOpenCart}
            className={`flex items-center gap-2.5 px-6 py-4 rounded-full font-black text-sm active:scale-95 transition-transform cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${cartButtonClass}`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span>
              {t('shopping_cart')} ({totalCartCount})
            </span>
          </button>
        </div>
      )}

      {/* Floating Store Owner WhatsApp Button (strictly the merchant's own number) */}
      {!embeddedPreview && storeWhatsAppHref && (
        <FloatingWhatsAppButton
          scope="storefront"
          ar={isArabic}
          href={storeWhatsAppHref}
          offsetBottom={!isArabic && totalCartCount > 0}
          tooltip={
            isArabic
              ? `تواصل مع ${store?.name || 'المتجر'} على واتساب`
              : `Chat with ${store?.name || 'the store'} on WhatsApp`
          }
          label={
            isArabic
              ? `تواصل مع صاحب متجر ${store?.name || ''} على واتساب`.trim()
              : `Contact ${store?.name || 'store'} owner on WhatsApp`
          }
        />
      )}

      <Footer />
    </div>
  );
};
