import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Search,
  Phone,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Plus,
  Minus,
  Check,
  Globe,
  Eye,
  ShieldCheck,
  MessageCircle,
  Clock,
  Star,
  X,
  Package,
} from 'lucide-react';
import { Store, Product, CartItem, StoreThemeId } from '../types';
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
  onUpdateQuantity?: (productId: string, delta: number) => void;
  onOpenCart: () => void;
  onBackToDashboard: () => void;
  onUpgradeClick?: () => void;
  previewMode?: boolean;
  themeOverride?: StoreThemeId;
  embeddedPreview?: boolean;
}

type SortOption = 'default' | 'price_asc' | 'price_desc';

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
  onUpdateQuantity,
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
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [catalogViewMode, setCatalogViewMode] = useState<'grid' | 'list'>('grid');
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
  const isClassic = activeTheme === 'classic';

  const currency = store?.currency || (isArabic ? 'ج.م' : '$');
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartValue = cart.reduce((sum, item) => sum + Number(item.product.price || 0) * item.quantity, 0);
  const cartQtyById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cart) {
      map[item.product.id] = item.quantity;
    }
    return map;
  }, [cart]);

  const phone = store?.whatsapp_number?.trim() || '';
  const displayPhone = phone ? (phone.startsWith('+') || phone.startsWith('0') ? phone : `+${phone}`) : '';
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
  const rawCategories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category || fallbackCategory))),
    [products, fallbackCategory]
  );
  const categories = useMemo(() => [t('all'), ...rawCategories], [t, rawCategories]);
  const categoryCounts = useMemo(
    () =>
      categories.reduce<Record<string, number>>((acc, cat) => {
        acc[cat] =
          cat === t('all')
            ? products.length
            : products.filter((p) => (p.category || fallbackCategory) === cat).length;
        return acc;
      }, {}),
    [categories, products, t, fallbackCategory]
  );

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = products.filter((p) => {
      const matchesCategory = selectedCategory === t('all') || (p.category || fallbackCategory) === selectedCategory;
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });

    if (sortBy === 'price_asc') {
      return [...list].sort((a, b) => Number(a.price) - Number(b.price));
    }
    if (sortBy === 'price_desc') {
      return [...list].sort((a, b) => Number(b.price) - Number(a.price));
    }
    return list;
  }, [products, selectedCategory, searchTerm, sortBy, t, fallbackCategory]);

  const featuredProduct = products[0] || null;
  const editorialHighlights = products.slice(0, 2);

  const handleAdd = (p: Product) => {
    if (!canOrder) return;
    onAddToCart(p);
    setAddedAnimationId(p.id);
    window.setTimeout(() => setAddedAnimationId((curr) => (curr === p.id ? null : curr)), 1200);
  };

  const scrollToCatalog = () => {
    const el = document.getElementById('store-catalog-section');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const formatPrice = (price: number) =>
    Number(price).toLocaleString(isArabic ? 'ar-EG' : 'en-US', {
      minimumFractionDigits: Number.isInteger(Number(price)) ? 0 : 2,
      maximumFractionDigits: 2,
    });

  const formatCount = (n: number) => n.toLocaleString(isArabic ? 'ar-EG' : 'en-US');

  // Theme-scoped surface tokens (strictly isolated under [data-store-theme])
  const shellClass = isTech
    ? 'bg-[#070b14] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-100'
    : isMinimal
      ? 'bg-[#fafaf8] text-zinc-950 selection:bg-zinc-900 selection:text-white'
      : isBoutique
        ? 'bg-[#fbf5ee] text-stone-900 selection:bg-amber-200 selection:text-stone-950'
        : isCatalog
          ? 'bg-slate-100 text-slate-900 selection:bg-emerald-100 selection:text-emerald-950'
          : 'bg-[#f4f9fe] text-slate-900 selection:bg-sky-100 selection:text-sky-900';

  const headerClass = isTech
    ? 'bg-[#0b1120]/95 border-b border-cyan-500/20 shadow-lg shadow-black/30'
    : isMinimal
      ? 'bg-[#fafaf8]/95 border-b border-zinc-200/90'
      : isBoutique
        ? 'bg-[#fffaf4]/95 border-b border-amber-900/15 shadow-sm shadow-amber-950/5'
        : isCatalog
          ? 'bg-white border-b border-slate-200 shadow-sm'
          : 'bg-white/95 border-b border-sky-100 shadow-sm shadow-sky-900/5';

  const cartButtonClass = isTech
    ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-500/25 rounded-xl'
    : isMinimal
      ? 'bg-zinc-950 hover:bg-zinc-800 text-white rounded-none tracking-wide'
      : isBoutique
        ? 'bg-[#8c2f13] hover:bg-[#6f240e] text-amber-50 rounded-full shadow-md shadow-amber-950/20'
        : isCatalog
          ? 'bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/20'
          : 'bg-gradient-to-l from-[#0084d6] to-[#0269b3] hover:from-[#0074bd] hover:to-[#015b9c] text-white rounded-2xl shadow-lg shadow-sky-600/25';

  const cartCountBadgeClass = isTech
    ? 'bg-slate-950 text-cyan-300'
    : isMinimal
      ? 'bg-white text-zinc-950'
      : isBoutique
        ? 'bg-amber-100 text-[#7c2d12]'
        : isCatalog
          ? 'bg-white text-emerald-700'
          : 'bg-white text-[#0084d6]';

  const gridClass = isMinimal
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-11'
    : isBoutique
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7'
      : isCatalog
        ? catalogViewMode === 'list'
          ? 'flex flex-col gap-3'
          : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4'
        : isTech
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'
          : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6';

  const mediaAspectClass = isMinimal
    ? 'aspect-[4/5]'
    : isBoutique
      ? 'aspect-[3/4]'
      : isCatalog
        ? 'aspect-[4/3]'
        : 'aspect-square';

  const renderCardAction = (p: Product, fullWidth = false) => {
    const qtyInCart = cartQtyById[p.id] || 0;
    const isAdded = addedAnimationId === p.id;

    if (qtyInCart > 0 && onUpdateQuantity && canOrder) {
      const stepperShell = isTech
        ? 'bg-cyan-500/15 border border-cyan-400/50 text-cyan-200 rounded-xl'
        : isMinimal
          ? 'bg-zinc-950 text-white rounded-none'
          : isBoutique
            ? 'bg-[#8c2f13] text-amber-50 rounded-full'
            : isCatalog
              ? 'bg-emerald-600 text-white rounded-lg'
              : 'bg-[#0084d6] text-white rounded-2xl shadow-sm shadow-sky-600/20';

      return (
        <div
          className={`inline-flex items-center justify-between gap-2 px-1.5 py-1.5 font-black text-xs ${
            fullWidth ? 'w-full' : 'min-w-[116px]'
          } ${stepperShell}`}
        >
          <button
            type="button"
            onClick={() => onUpdateQuantity(p.id, -1)}
            aria-label={isArabic ? 'تقليل الكمية' : 'Decrease quantity'}
            className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-xs px-1">{formatCount(qtyInCart)}</span>
          <button
            type="button"
            onClick={() => onUpdateQuantity(p.id, 1)}
            aria-label={isArabic ? 'زيادة الكمية' : 'Increase quantity'}
            className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    const addBtnClass = isAdded
      ? 'bg-emerald-600 text-white border border-emerald-500'
      : isTech
        ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl shadow-md shadow-cyan-500/15'
        : isMinimal
          ? 'bg-zinc-950 hover:bg-zinc-800 text-white rounded-none'
          : isBoutique
            ? 'bg-[#8c2f13] hover:bg-[#6f240e] text-amber-50 rounded-full shadow-sm'
            : isCatalog
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm'
              : 'bg-[#e6f4fe] text-[#0084d6] hover:bg-[#0084d6] hover:text-white border border-sky-200 rounded-2xl';

    return (
      <button
        type="button"
        disabled={!canOrder}
        onClick={() => handleAdd(p)}
        className={`px-3.5 py-2.5 text-xs font-black transition-all inline-flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
          fullWidth ? 'w-full' : ''
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
    );
  };

  return (
    <div
      dir={isArabic ? 'rtl' : 'ltr'}
      data-store-theme={activeTheme}
      className={`min-h-screen flex flex-col justify-between font-cairo transition-colors ${shellClass}`}
    >
      {/* 1. THEME ANNOUNCEMENT RIBBON + NAVBAR */}
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

        {/* Theme-specific Top Accent / Announcement Strip */}
        {isClassic && (
          <div className="bg-gradient-to-l from-[#0e1f38] via-[#103059] to-[#0074bd] text-white/95 text-[11px] font-bold py-1.5 px-4">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center sm:justify-between gap-x-5 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-300" />
                <span>{isArabic ? 'تسوّق آمن ومباشر من المتجر' : 'Safe & direct shopping from the store'}</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-4 text-sky-100/90">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-sky-300" />
                  {isArabic ? 'مفتوح 24/7 للطلبات' : 'Open 24/7 for orders'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="w-3 h-3 text-emerald-300" />
                  {isArabic ? 'تأكيد سريع عبر واتساب' : 'Instant WhatsApp confirmation'}
                </span>
              </span>
            </div>
          </div>
        )}

        {isMinimal && (
          <div className="bg-zinc-950 text-zinc-200 text-[10px] font-bold tracking-widest uppercase py-1.5 px-4 text-center">
            {isArabic
              ? `${store?.name || 'المتجر'} · تشكيلة مختارة · طلب مباشر وسريع`
              : `${store?.name || 'STORE'} · CURATED COLLECTION · DIRECT ORDERING`}
          </div>
        )}

        {isBoutique && (
          <div className="bg-[#431407] text-amber-100 text-[11px] font-bold py-1.5 px-4 text-center">
            <span className="inline-flex items-center gap-2">
              <Star className="w-3 h-3 text-amber-300 fill-amber-300" />
              <span>
                {isArabic
                  ? `أهلًا بكم في ${store?.name || 'البوتيك'} — قطع منتقاة بعناية وطلب مباشر`
                  : `Welcome to ${store?.name || 'the Boutique'} — Handpicked pieces & direct ordering`}
              </span>
              <Star className="w-3 h-3 text-amber-300 fill-amber-300" />
            </span>
          </div>
        )}

        {isTech && (
          <div className="bg-[#050810] border-b border-slate-800/90 text-[11px] font-mono text-slate-300 py-1.5 px-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-cyan-300 font-bold">
                  {isArabic ? 'المتجر متصل · استقبال طلبات مباشر' : 'STORE ONLINE · DIRECT CHECKOUT READY'}
                </span>
              </span>
              <span className="hidden sm:inline text-slate-400">
                {isArabic ? 'طلب مباشر 24/7' : 'DIRECT ORDER 24/7'}
              </span>
            </div>
          </div>
        )}

        {isCatalog && <div className="h-1 w-full bg-gradient-to-l from-emerald-500 via-emerald-600 to-teal-600" />}

        {/* Navbar Body */}
        {isMinimal ? (
          /* Minimal Editorial Centered Header */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <div className="flex items-center gap-2">
              {!embeddedPreview && (
                <button
                  type="button"
                  onClick={toggleLang}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-zinc-700 border border-zinc-300 hover:border-zinc-950 hover:text-zinc-950 transition-colors cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{t('lang_switch')}</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-center gap-2.5 min-w-0">
              <img
                src={logoSrc}
                alt={store?.name || 'Store Logo'}
                className="w-9 h-9 object-contain border border-zinc-200 bg-white p-1 shrink-0"
              />
              <div className="text-center min-w-0">
                <h1 className="text-base sm:text-xl font-black text-zinc-950 tracking-wide truncate">
                  {store?.name || t('daidar_solutions')}
                </h1>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 truncate hidden sm:block">
                  {store?.activity_type || t('cloud_store_mgmt')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                disabled={!canOrder}
                onClick={onOpenCart}
                className={`relative inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 font-extrabold text-xs active:scale-95 transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${cartButtonClass}`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">{t('shopping_cart')}</span>
                <span className={`font-black text-[11px] px-1.5 py-0.5 ${cartCountBadgeClass}`}>{totalCartCount}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Classic / Boutique / Tech / Catalog Header */
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={logoSrc}
                alt={store?.name || 'Store Logo'}
                className={`w-10 h-10 sm:w-11 sm:h-11 object-contain shrink-0 p-1 ${
                  isTech
                    ? 'rounded-xl bg-slate-900 border border-cyan-500/35 shadow-md shadow-cyan-500/10'
                    : isBoutique
                      ? 'rounded-full bg-white border-2 border-amber-900/25 shadow-sm'
                      : isCatalog
                        ? 'rounded-xl bg-emerald-50 border border-emerald-200'
                        : 'rounded-2xl bg-white border border-sky-200 shadow-sm'
                }`}
              />
              <div className="min-w-0">
                <h1
                  className={`text-sm sm:text-lg font-black leading-tight truncate max-w-[160px] sm:max-w-xs md:max-w-sm ${
                    isTech ? 'text-white tracking-tight' : isBoutique ? 'text-stone-900' : 'text-[#0e1f38]'
                  }`}
                >
                  {store?.name || t('daidar_solutions')}
                </h1>
                <p
                  className={`text-[11px] mt-0.5 truncate hidden sm:block font-bold ${
                    isTech
                      ? 'text-cyan-400 font-mono'
                      : isBoutique
                        ? 'text-amber-900/75'
                        : isCatalog
                          ? 'text-emerald-700'
                          : 'text-[#0084d6]'
                  }`}
                >
                  {store?.activity_type || t('cloud_store_mgmt')}
                </p>
              </div>
            </div>

            {/* Catalog Theme: Integrated Command Search in Header on md+ */}
            {isCatalog && (
              <div className="hidden md:block relative flex-1 max-w-md mx-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={isArabic ? 'ابحث بسرعة باسم المنتج أو التصنيف...' : 'Quick search by product or category...'}
                  className="w-full px-4 py-2 ps-10 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                />
                <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-2.5" />
              </div>
            )}

            <div className="flex items-center gap-2 shrink-0">
              {!embeddedPreview && (
                <button
                  type="button"
                  onClick={toggleLang}
                  className={`flex items-center gap-1 px-2.5 py-2 text-xs font-bold border transition-colors cursor-pointer ${
                    isTech
                      ? 'rounded-xl text-slate-200 border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800'
                      : isBoutique
                        ? 'rounded-full text-stone-800 border-amber-900/20 hover:bg-amber-100/60'
                        : 'rounded-xl text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Globe
                    className={`w-3.5 h-3.5 ${
                      isTech ? 'text-cyan-400' : isBoutique ? 'text-[#8c2f13]' : isCatalog ? 'text-emerald-600' : 'text-[#0084d6]'
                    }`}
                  />
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
                {isCatalog && totalCartCount > 0 && (
                  <span className="hidden lg:inline font-mono text-[11px] opacity-90">
                    {formatPrice(totalCartValue)} {currency}
                  </span>
                )}
                <span className={`font-black text-xs px-2 py-0.5 rounded-full ${cartCountBadgeClass}`}>
                  {totalCartCount}
                </span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 2. THEME-SPECIFIC RICH HERO SECTIONS */}
      {isMinimal ? (
        /* ── THEME 2: MINIMAL EDITORIAL ── */
        <section className="bg-[#fafaf8] border-b border-zinc-200 py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto space-y-10">
            <div className="max-w-3xl mx-auto text-center space-y-5">
              <div className="inline-flex items-center gap-3 text-[11px] font-bold tracking-widest uppercase text-zinc-500">
                <span className="h-px w-8 bg-zinc-300" />
                <span>{store?.activity_type || t('shop_safe')}</span>
                <span className="h-px w-8 bg-zinc-300" />
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-zinc-950 tracking-tight leading-tight">
                {store?.name || t('platform_name')}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 leading-8 max-w-xl mx-auto">
                {store?.bio ||
                  (isArabic
                    ? 'مجموعة منتقاة بتفاصيل هادئة وتجربة تسوق راقية تضع جودة المنتج في المقدمة مع طلب مباشر وسريع.'
                    : 'A curated collection designed with calm clarity, putting product craftsmanship first with effortless ordering.')}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={scrollToCatalog}
                  className="px-7 py-3 bg-zinc-950 text-white text-xs font-extrabold tracking-wide hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  {isArabic ? 'استكشف المجموعة' : 'Explore Collection'}
                </button>
                {storeWhatsAppHref ? (
                  <a
                    href={storeWhatsAppHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-zinc-300 bg-white px-5 py-3 text-xs font-bold text-zinc-900 hover:border-zinc-950 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{isArabic ? 'استشارة عبر واتساب' : 'WhatsApp Concierge'}</span>
                  </a>
                ) : phone ? (
                  <a
                    href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                    className="inline-flex items-center gap-2 border border-zinc-300 bg-white px-5 py-3 text-xs font-bold text-zinc-900 hover:border-zinc-950 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span dir="ltr" className="font-mono">
                      {displayPhone}
                    </span>
                  </a>
                ) : null}
              </div>
            </div>

            {/* Editorial Lookbook Feature Strip */}
            {editorialHighlights.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                {editorialHighlights.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedProduct(item)}
                    className="group relative overflow-hidden bg-zinc-100 border border-zinc-200 text-start cursor-pointer aspect-[16/9]"
                  >
                    <img
                      src={item.image_data || FALLBACK_PRODUCT_SVG}
                      alt={item.name}
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_PRODUCT_SVG;
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/75 via-zinc-950/15 to-transparent" />
                    <div className="absolute bottom-4 inset-x-5 flex items-end justify-between gap-3 text-white">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300 block">
                          {index === 0
                            ? isArabic
                              ? 'إصدار مميز 01'
                              : 'FEATURED 01'
                            : isArabic
                              ? 'مختارات 02'
                              : 'CURATED 02'}
                        </span>
                        <p className="text-sm sm:text-base font-black truncate mt-0.5">{item.name}</p>
                      </div>
                      <span className="shrink-0 bg-white text-zinc-950 px-3 py-1 text-xs font-black font-mono">
                        {formatPrice(item.price)} {currency}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : isBoutique ? (
        /* ── THEME 3: WARM LUXURY BOUTIQUE ── */
        <section className="py-7 sm:py-10 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="relative overflow-hidden rounded-[2rem] border border-amber-900/20 bg-gradient-to-br from-[#f6e7d8] via-[#fdf8f2] to-[#efdac4] p-6 sm:p-10 shadow-md shadow-amber-950/5">
              {/* Decorative subtle inner frame */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-3 rounded-[1.5rem] border border-amber-900/10"
              />
              <div className="relative grid grid-cols-1 lg:grid-cols-[1.25fr_0.9fr] items-center gap-8">
                <div className="space-y-4 text-center lg:text-start">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-4 py-1.5 border border-amber-900/15 text-[11px] font-extrabold text-[#8c2f13] shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>{store?.activity_type || (isArabic ? 'بوتيك مختار' : 'Curated Boutique')}</span>
                  </div>

                  <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-stone-900 tracking-tight leading-tight">
                    {t('welcome_to')} {store?.name || t('platform_name')}
                  </h2>

                  <p className="text-xs sm:text-sm text-stone-700 leading-8 max-w-xl mx-auto lg:mx-0">
                    {store?.bio ||
                      (isArabic
                        ? 'تشكيلة منتقاة بعناية فائقة لتمنحك تجربة تسوق أنيقة ودافئة مع خدمة تواصل وطلب مباشر.'
                        : 'Carefully curated pieces crafted for a warm, elevated shopping experience with direct concierge ordering.')}
                  </p>

                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1">
                    <button
                      type="button"
                      onClick={scrollToCatalog}
                      className="rounded-full bg-[#8c2f13] hover:bg-[#6f240e] text-amber-50 px-6 py-3 text-xs font-black shadow-md shadow-amber-950/20 transition-all cursor-pointer"
                    >
                      {isArabic ? 'تسوق المختارات' : 'Shop Curated Pieces'}
                    </button>
                    {phone && (
                      <a
                        href={storeWhatsAppHref || `tel:${phone.replace(/[^\d+]/g, '')}`}
                        target={storeWhatsAppHref ? '_blank' : undefined}
                        rel={storeWhatsAppHref ? 'noopener noreferrer' : undefined}
                        className="inline-flex items-center gap-2 rounded-full bg-white/90 border border-amber-900/20 px-5 py-3 text-xs font-extrabold text-stone-800 hover:bg-white transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#8c2f13]" />
                        <span dir="ltr" className="font-mono">
                          {displayPhone}
                        </span>
                      </a>
                    )}
                  </div>

                  {/* Luxury Guarantees */}
                  <div className="grid grid-cols-3 gap-2 pt-3 max-w-md mx-auto lg:mx-0">
                    {[
                      { label: isArabic ? 'اختيار راقٍ' : 'Curated Quality' },
                      { label: isArabic ? 'تواصل شخصي' : 'Personal Service' },
                      { label: isArabic ? 'طلب فوري' : 'Instant Order' },
                    ].map((badge) => (
                      <div
                        key={badge.label}
                        className="rounded-xl bg-white/65 border border-amber-900/10 px-2.5 py-2 text-center text-[11px] font-extrabold text-stone-800"
                      >
                        {badge.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Boutique Signature Spotlight Card */}
                <div className="mx-auto w-full max-w-sm">
                  {featuredProduct ? (
                    <div
                      onClick={() => setSelectedProduct(featuredProduct)}
                      className="group cursor-pointer rounded-3xl bg-white p-3.5 border border-amber-900/15 shadow-xl shadow-amber-950/10 transition-transform hover:-translate-y-1"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#f6ede2]">
                        <img
                          src={featuredProduct.image_data || FALLBACK_PRODUCT_SVG}
                          alt={featuredProduct.name}
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_PRODUCT_SVG;
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <span
                          className={`absolute top-2.5 ${isArabic ? 'right-2.5' : 'left-2.5'} rounded-full bg-[#431407]/90 text-amber-100 px-3 py-1 text-[10px] font-extrabold`}
                        >
                          {isArabic ? 'اختيار البوتيك' : 'Boutique Pick'}
                        </span>
                      </div>
                      <div className="pt-3 px-1 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-stone-900 truncate">{featuredProduct.name}</p>
                          <p className="text-[11px] text-stone-500 truncate">{featuredProduct.category || fallbackCategory}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-amber-100 text-[#8c2f13] px-3 py-1 text-xs font-black font-mono">
                          {formatPrice(featuredProduct.price)} {currency}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl bg-white/85 p-6 border border-amber-900/15 text-center space-y-3 shadow-md">
                      <img
                        src={logoSrc}
                        alt={store?.name || 'Boutique'}
                        className="w-16 h-16 mx-auto rounded-full border-2 border-amber-900/20 p-2 bg-white object-contain"
                      />
                      <p className="text-sm font-black text-stone-900">{store?.name || t('platform_name')}</p>
                      <p className="text-xs text-stone-600">
                        {isArabic ? 'قريبًا سيتم عرض أحدث قطع المجموعة هنا.' : 'New curated arrivals will appear here soon.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : isTech ? (
        /* ── THEME 4: DARK TECH PRO ── */
        <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-b from-[#0d1526] via-[#090f1d] to-[#070b14] py-9 sm:py-12 px-4 sm:px-6 lg:px-8">
          {/* Architectural Grid + Soft Ambient Glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(6,182,212,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(6,182,212,0.16) 1px, transparent 1px)',
              backgroundSize: '36px 36px',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 start-1/4 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 end-1/4 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl"
          />

          <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1.25fr_0.9fr] items-center gap-8">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-cyan-300 bg-cyan-950/80 px-3 py-1 rounded-lg border border-cyan-500/35">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{store?.activity_type || t('shop_safe')}</span>
                </span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                {store?.name || t('platform_name')}
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-7 max-w-xl">
                {store?.bio ||
                  (isArabic
                    ? 'تصفح المواصفات والأسعار بدقة عالية وأضف اختياراتك للسلة لتأكيد الطلب فورًا عبر واتساب.'
                    : 'Compare specifications and pricing with crystal clarity, then check out directly in one step.')}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={scrollToCatalog}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 px-5 py-3 text-xs font-black shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                >
                  <span>{isArabic ? 'استعرض المنتجات' : 'Browse Catalog'}</span>
                  {isArabic ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
                {phone && (
                  <a
                    href={storeWhatsAppHref || `tel:${phone.replace(/[^\d+]/g, '')}`}
                    target={storeWhatsAppHref ? '_blank' : undefined}
                    rel={storeWhatsAppHref ? 'noopener noreferrer' : undefined}
                    className="inline-flex items-center gap-2.5 rounded-xl bg-[#111827] border border-slate-700 hover:border-cyan-500/60 px-4 py-3 text-xs font-bold text-slate-100 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-cyan-400" />
                    <span dir="ltr" className="font-mono">
                      {displayPhone}
                    </span>
                  </a>
                )}
              </div>

              {/* Tech Highlights */}
              <div className="grid grid-cols-3 gap-3 max-w-md pt-1">
                <div className="rounded-xl bg-[#111827]/90 border border-slate-800 p-3">
                  <span className="text-[10px] font-mono text-slate-400 block">{isArabic ? 'التصفح' : 'BROWSING'}</span>
                  <strong className="text-xs font-black text-cyan-400">{isArabic ? 'سريع ومنظم' : 'FAST UI'}</strong>
                </div>
                <div className="rounded-xl bg-[#111827]/90 border border-slate-800 p-3">
                  <span className="text-[10px] font-mono text-slate-400 block">{isArabic ? 'التواصل' : 'SUPPORT'}</span>
                  <strong className="text-xs font-black text-white">{isArabic ? 'مباشر' : 'DIRECT'}</strong>
                </div>
                <div className="rounded-xl bg-[#111827]/90 border border-slate-800 p-3">
                  <span className="text-[10px] font-mono text-slate-400 block">{isArabic ? 'الطلب' : 'CHECKOUT'}</span>
                  <strong className="text-xs font-black text-emerald-400">{isArabic ? 'فوري 24/7' : 'LIVE 24/7'}</strong>
                </div>
              </div>
            </div>

            {/* Tech Featured Spec Card */}
            <div className="w-full max-w-sm mx-auto">
              {featuredProduct ? (
                <div
                  onClick={() => setSelectedProduct(featuredProduct)}
                  className="group cursor-pointer rounded-2xl bg-[#111827]/95 border border-cyan-500/30 p-4 shadow-2xl shadow-cyan-950/40 hover:border-cyan-400/70 transition-all"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300 mb-3">
                    <span>{isArabic ? 'منتج مميز // SPOTLIGHT' : 'FEATURED // SPOTLIGHT'}</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30">
                      {featuredProduct.category || fallbackCategory}
                    </span>
                  </div>
                  <div className="aspect-[16/10] overflow-hidden rounded-xl bg-slate-900 border border-slate-800">
                    <img
                      src={featuredProduct.image_data || FALLBACK_PRODUCT_SVG}
                      alt={featuredProduct.name}
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_PRODUCT_SVG;
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="mt-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white truncate">{featuredProduct.name}</p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{featuredProduct.description}</p>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-black text-cyan-400">
                      {formatPrice(featuredProduct.price)} {currency}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-[#111827]/95 border border-slate-800 p-6 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Package className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-black text-white">{store?.name || t('platform_name')}</p>
                  <p className="text-xs font-mono text-slate-400">
                    {isArabic ? 'الواجهة جاهزة لاستقبال المنتجات والطلبات' : 'STOREFRONT READY FOR INVENTORY'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : isCatalog ? (
        /* ── THEME 5: FAST STRUCTURED CATALOG ── */
        <section className="bg-white border-b border-slate-200 py-5 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 truncate">
                  {store?.name || t('platform_name')}
                </h2>
              </div>
              <p className="text-xs text-slate-600 line-clamp-2 max-w-2xl">
                {store?.bio ||
                  (isArabic
                    ? 'كتالوج سريع ومنظم لتصفح الأصناف والأسعار وإضافة الكميات للسلة بأقل عدد خطوات.'
                    : 'Fast, organized catalog built for rapid browsing, price comparison, and multi-item ordering.')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {phone && (
                <a
                  href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-extrabold text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-700" />
                  <span dir="ltr" className="font-mono">
                    {displayPhone}
                  </span>
                </a>
              )}
              {storeWhatsAppHref && (
                <a
                  href={storeWhatsAppHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-extrabold text-white transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'طلب عبر واتساب' : 'WhatsApp Order'}</span>
                </a>
              )}
            </div>
          </div>
        </section>
      ) : (
        /* ── THEME 1: MODERN CLASSIC COMMERCE ── */
        <section className="relative overflow-hidden bg-gradient-to-b from-white via-[#f7fbff] to-[#edf6fe] border-b border-sky-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 end-10 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl"
          />
          <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1.25fr_0.9fr] items-center gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-black text-[#0084d6] bg-[#e6f4fe] px-3.5 py-1.5 rounded-full border border-sky-200/80">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {store?.activity_type || t('shop_safe')} • {t('whatsapp_order')}
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0e1f38] tracking-tight leading-tight">
                {t('welcome_to')} <span className="text-[#0084d6]">{store?.name || t('platform_name')}</span>
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 leading-7 max-w-xl font-medium">
                {store?.bio ||
                  (isArabic
                    ? 'تصفح أحدث المنتجات والعروض المتوفرة، وأضف اختياراتك للسلة لإتمام الطلب مباشرة عبر واتساب بخطوة واحدة.'
                    : 'Browse our latest products and collections, add favorites to your bag, and order directly via WhatsApp in one click.')}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={scrollToCatalog}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#0084d6] hover:bg-[#0074bd] text-white text-xs sm:text-sm font-black shadow-lg shadow-sky-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  <span>{isArabic ? 'تصفح المنتجات الآن' : 'Shop Now'}</span>
                  {isArabic ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
                {phone && (
                  <a
                    href={storeWhatsAppHref || `tel:${phone.replace(/[^\d+]/g, '')}`}
                    target={storeWhatsAppHref ? '_blank' : undefined}
                    rel={storeWhatsAppHref ? 'noopener noreferrer' : undefined}
                    className="inline-flex items-center gap-2.5 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm hover:border-sky-300 transition-all"
                  >
                    <span className="w-8 h-8 rounded-xl bg-[#e6f4fe] text-[#0084d6] flex items-center justify-center">
                      <Phone className="w-4 h-4" />
                    </span>
                    <span className="text-start">
                      <span className="text-[10px] text-slate-400 block font-bold leading-tight">
                        {t('support_inquiry')}
                      </span>
                      <span dir="ltr" className="text-xs font-black text-[#0e1f38] font-mono block">
                        {displayPhone}
                      </span>
                    </span>
                  </a>
                )}
              </div>

              {/* Classic Trust Feature Pills */}
              <div className="grid grid-cols-3 gap-2.5 pt-2 max-w-lg">
                <div className="rounded-2xl bg-white/90 border border-sky-100 p-3 shadow-sm">
                  <strong className="block text-xs sm:text-sm font-black text-[#0084d6]">
                    {isArabic ? 'طلب سريع' : 'Fast Order'}
                  </strong>
                  <span className="text-[11px] font-bold text-slate-500">{isArabic ? 'بخطوة واحدة' : 'In one click'}</span>
                </div>
                <div className="rounded-2xl bg-white/90 border border-sky-100 p-3 shadow-sm">
                  <strong className="block text-xs sm:text-sm font-black text-[#0e1f38]">
                    {isArabic ? 'متاح 24/7' : 'Open 24/7'}
                  </strong>
                  <span className="text-[11px] font-bold text-slate-500">{isArabic ? 'تصفح بأي وقت' : 'Shop anytime'}</span>
                </div>
                <div className="rounded-2xl bg-white/90 border border-sky-100 p-3 shadow-sm">
                  <strong className="block text-xs sm:text-sm font-black text-emerald-600">{isArabic ? 'مباشر' : 'Direct'}</strong>
                  <span className="text-[11px] font-bold text-slate-500">{isArabic ? 'عبر واتساب' : 'Via WhatsApp'}</span>
                </div>
              </div>
            </div>

            {/* Classic Spotlight Visual Card */}
            <div className="w-full max-w-sm mx-auto">
              {featuredProduct ? (
                <div
                  onClick={() => setSelectedProduct(featuredProduct)}
                  className="group cursor-pointer rounded-3xl bg-white p-4 border border-sky-100 shadow-xl shadow-sky-900/10 hover:-translate-y-1 transition-all"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sky-50">
                    <img
                      src={featuredProduct.image_data || FALLBACK_PRODUCT_SVG}
                      alt={featuredProduct.name}
                      onError={(e) => {
                        e.currentTarget.src = FALLBACK_PRODUCT_SVG;
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span
                      className={`absolute top-2.5 ${isArabic ? 'right-2.5' : 'left-2.5'} rounded-full bg-[#0e1f38]/85 text-white px-3 py-1 text-[10px] font-black`}
                    >
                      {isArabic ? 'منتج مميز' : 'Featured'}
                    </span>
                  </div>
                  <div className="pt-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#0e1f38] truncate">{featuredProduct.name}</p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {featuredProduct.category || fallbackCategory}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-xl bg-[#e6f4fe] text-[#0084d6] px-3 py-1.5 text-xs font-black font-mono">
                      {formatPrice(featuredProduct.price)} {currency}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl bg-white p-6 border border-sky-100 shadow-lg shadow-sky-900/5 text-center space-y-3">
                  <img
                    src={logoSrc}
                    alt={store?.name || 'Store'}
                    className="w-16 h-16 mx-auto rounded-2xl border border-sky-100 bg-sky-50/50 p-2 object-contain"
                  />
                  <div>
                    <p className="text-base font-black text-[#0e1f38]">{store?.name || t('platform_name')}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {isArabic ? 'جاهز لاستقبال طلباتك فور إضافة المنتجات' : 'Ready to take orders as soon as products are added'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 3. MAIN CATALOG SECTION */}
      <main
        id="store-catalog-section"
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 space-y-6 ${isCatalog ? 'py-5' : 'py-8 sm:py-10'}`}
      >
        {/* Filter + Search + Sort + View Mode Toolbar */}
        <div
          className={`space-y-4 ${
            isMinimal
              ? 'border-b border-zinc-200 pb-5'
              : isTech
                ? 'rounded-2xl bg-[#0d1424] border border-slate-800 p-4'
                : isCatalog
                  ? 'rounded-2xl bg-white border border-slate-200 p-3.5 shadow-sm'
                  : isBoutique
                    ? 'rounded-3xl bg-white/80 border border-amber-900/10 p-4 shadow-sm'
                    : 'rounded-3xl bg-white border border-slate-200/80 p-4 shadow-sm'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
              {categories.map((cat) => {
                const selected = selectedCategory === cat;
                const pillClass = isTech
                  ? selected
                    ? 'bg-cyan-400 text-slate-950 rounded-xl shadow-md shadow-cyan-500/20'
                    : 'bg-[#111827] text-slate-300 hover:text-white border border-slate-700/80 rounded-xl'
                  : isMinimal
                    ? selected
                      ? 'border-b-2 border-zinc-950 text-zinc-950 rounded-none bg-transparent px-3'
                      : 'text-zinc-500 hover:text-zinc-950 rounded-none bg-transparent px-3'
                    : isBoutique
                      ? selected
                        ? 'bg-[#8c2f13] text-amber-50 rounded-full shadow-sm'
                        : 'bg-[#fdf8f2] text-stone-700 hover:bg-amber-100/70 border border-amber-900/15 rounded-full'
                      : isCatalog
                        ? selected
                          ? 'bg-emerald-600 text-white rounded-lg shadow-sm'
                          : 'bg-slate-50 text-slate-700 hover:bg-emerald-50 border border-slate-200 rounded-lg'
                        : selected
                          ? 'bg-[#0084d6] text-white rounded-full shadow-md shadow-sky-600/20'
                          : 'bg-slate-50 text-slate-700 hover:bg-sky-50 border border-slate-200 rounded-full';

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-2 text-xs font-black whitespace-nowrap transition-all cursor-pointer inline-flex items-center gap-1.5 ${pillClass}`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                        selected
                          ? isMinimal
                            ? 'bg-zinc-950 text-white'
                            : isTech
                              ? 'bg-slate-950/20 text-slate-950'
                              : 'bg-white/20 text-white'
                          : isTech
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-black/5 text-current opacity-70'
                      }`}
                    >
                      {formatCount(categoryCounts[cat] || 0)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search + Sort + View Switcher */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
              {/* Mobile/General Search (always shown except desktop Catalog where header already has search) */}
              <div className={`relative flex-1 min-w-[190px] sm:w-60 ${isCatalog ? 'md:hidden' : ''}`}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={isArabic ? 'ابحث عن منتج...' : 'Search products...'}
                  className={`w-full px-4 py-2.5 ps-9 text-xs font-medium outline-none transition-all ${
                    isTech
                      ? 'rounded-xl border border-slate-700 bg-[#111827] text-slate-100 placeholder:text-slate-400 focus:border-cyan-400'
                      : isMinimal
                        ? 'rounded-none border-b border-zinc-300 bg-transparent text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950'
                        : isBoutique
                          ? 'rounded-full border border-amber-900/20 bg-white text-stone-900 placeholder:text-stone-400 focus:border-[#8c2f13]'
                          : isCatalog
                            ? 'rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:bg-white focus:border-emerald-600'
                            : 'rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-[#0084d6]'
                  }`}
                />
                <Search className="w-4 h-4 absolute start-3 top-2.5 text-slate-400" />
              </div>

              {/* Sort Dropdown */}
              <select
                aria-label={isArabic ? 'ترتيب المنتجات' : 'Sort products'}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className={`px-3 py-2.5 text-xs font-bold outline-none cursor-pointer transition-colors ${
                  isTech
                    ? 'rounded-xl border border-slate-700 bg-[#111827] text-slate-200 focus:border-cyan-400'
                    : isMinimal
                      ? 'rounded-none border border-zinc-300 bg-white text-zinc-900 focus:border-zinc-950'
                      : isBoutique
                        ? 'rounded-full border border-amber-900/20 bg-white text-stone-800 focus:border-[#8c2f13]'
                        : isCatalog
                          ? 'rounded-xl border border-slate-300 bg-white text-slate-800 focus:border-emerald-600'
                          : 'rounded-2xl border border-slate-200 bg-white text-slate-700 focus:border-[#0084d6]'
                }`}
              >
                <option value="default">{isArabic ? 'الترتيب: الافتراضي' : 'Sort: Default'}</option>
                <option value="price_asc">{isArabic ? 'السعر: الأقل للأعلى' : 'Price: Low to High'}</option>
                <option value="price_desc">{isArabic ? 'السعر: الأعلى للأقل' : 'Price: High to Low'}</option>
              </select>

              {/* Catalog Grid / List Switcher */}
              {isCatalog && (
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCatalogViewMode('grid')}
                    aria-label={isArabic ? 'عرض شبكة' : 'Grid view'}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      catalogViewMode === 'grid' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogViewMode('list')}
                    aria-label={isArabic ? 'عرض قائمة سريعة' : 'Quick list view'}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      catalogViewMode === 'list' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <circle cx="4" cy="6" r="1" fill="currentColor" />
                      <circle cx="4" cy="12" r="1" fill="currentColor" />
                      <circle cx="4" cy="18" r="1" fill="currentColor" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Results Count Summary */}
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className={isTech ? 'text-slate-400 font-mono' : isBoutique ? 'text-stone-500' : 'text-slate-500'}>
              {isArabic
                ? `عرض ${formatCount(filteredProducts.length)} من أصل ${formatCount(products.length)} منتج`
                : `Showing ${formatCount(filteredProducts.length)} of ${formatCount(products.length)} products`}
            </span>
            {(searchTerm || selectedCategory !== t('all') || sortBy !== 'default') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory(t('all'));
                  setSortBy('default');
                }}
                className={`underline cursor-pointer ${
                  isTech ? 'text-cyan-400' : isBoutique ? 'text-[#8c2f13]' : isCatalog ? 'text-emerald-700' : 'text-[#0084d6]'
                }`}
              >
                {isArabic ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
              </button>
            )}
          </div>
        </div>

        {/* Products Grid or List */}
        {filteredProducts.length === 0 ? (
          <div
            className={`rounded-3xl border border-dashed p-12 text-center ${
              isTech
                ? 'bg-[#0f172a] border-slate-700 text-slate-300'
                : isMinimal
                  ? 'bg-white border-zinc-300 text-zinc-700 rounded-none'
                  : isBoutique
                    ? 'bg-white/90 border-amber-900/20 text-stone-700'
                    : 'bg-white border-slate-300 text-slate-700'
            }`}
          >
            <ShoppingBag className={`w-12 h-12 mx-auto mb-3 ${isTech ? 'text-slate-600' : 'text-slate-300'}`} />
            <h3 className="text-base font-black">
              {products.length === 0
                ? isArabic
                  ? 'لا توجد منتجات مضافة في هذا المتجر بعد'
                  : 'No products added to this store yet'
                : isArabic
                  ? 'لا توجد منتجات تطابق بحثك'
                  : 'No products match your search'}
            </h3>
            <p className={`text-xs mt-1.5 ${isTech ? 'text-slate-400' : 'text-slate-500'}`}>
              {products.length === 0
                ? isArabic
                  ? 'سيتم عرض المنتجات هنا بمجرد إضافتها من لوحة التحكم.'
                  : 'Products will appear here as soon as they are added from the dashboard.'
                : isArabic
                  ? 'جرّب البحث بكلمة أخرى أو اختر تصنيفًا مختلفًا.'
                  : 'Try another search term or switch categories.'}
            </p>
          </div>
        ) : (
          <div className={gridClass}>
            {filteredProducts.map((p) => {
              const imgSrc = p.image_data || FALLBACK_PRODUCT_SVG;

              /* Catalog Quick-Order Horizontal List Row */
              if (isCatalog && catalogViewMode === 'list') {
                return (
                  <article
                    key={p.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm hover:border-emerald-400 transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(p)}
                        className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 cursor-pointer group"
                      >
                        <img
                          src={imgSrc}
                          alt={p.name}
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_PRODUCT_SVG;
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {p.category && (
                            <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                              {p.category}
                            </span>
                          )}
                          <h3
                            onClick={() => setSelectedProduct(p)}
                            className="text-sm font-black text-slate-900 hover:text-emerald-700 cursor-pointer truncate"
                          >
                            {p.name}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-1">
                          {p.description || (isArabic ? 'جودة ممتازة وطلب مباشر سريع.' : 'Great quality and fast direct ordering.')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                      <div className="text-start sm:text-end">
                        <span className="text-base font-black font-mono text-emerald-700">
                          {formatPrice(p.price)}{' '}
                          <span className="text-[11px] font-bold text-slate-500">{currency}</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(p)}
                        aria-label={isArabic ? 'معاينة سريعة' : 'Quick view'}
                        className="p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-700 cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {renderCardAction(p, false)}
                    </div>
                  </article>
                );
              }

              const cardClass = isTech
                ? 'bg-[#111827] rounded-2xl border border-slate-800 hover:border-cyan-400/60 shadow-lg shadow-black/30 hover:-translate-y-1'
                : isMinimal
                  ? 'bg-transparent rounded-none border-b border-zinc-200 pb-5'
                  : isBoutique
                    ? 'bg-white rounded-3xl border border-amber-900/15 hover:border-amber-900/35 shadow-sm hover:shadow-xl hover:shadow-amber-950/10 hover:-translate-y-1'
                    : isCatalog
                      ? 'bg-white rounded-2xl border border-slate-200 hover:border-emerald-400 shadow-sm hover:shadow-md'
                      : 'bg-white rounded-3xl border border-slate-200/80 shadow-md shadow-sky-900/5 hover:shadow-xl hover:shadow-sky-900/10 hover:-translate-y-1';

              return (
                <article
                  key={p.id}
                  className={`overflow-hidden transition-all duration-300 flex flex-col justify-between group ${cardClass}`}
                >
                  {/* Product Media Frame */}
                  <div
                    onClick={() => setSelectedProduct(p)}
                    className={`relative ${mediaAspectClass} w-full cursor-pointer overflow-hidden ${
                      isTech
                        ? 'bg-slate-900'
                        : isMinimal
                          ? 'bg-zinc-100 border border-zinc-200/80'
                          : isBoutique
                            ? 'bg-[#f6ede2]'
                            : 'bg-slate-100'
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

                    {/* Subtle Tech Top Accent Bar on Hover */}
                    {isTech && (
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}

                    {/* Category Badge */}
                    {p.category && (
                      <span
                        className={`absolute top-2.5 ${isArabic ? 'right-2.5' : 'left-2.5'} text-[10px] font-black px-2.5 py-1 backdrop-blur-sm ${
                          isTech
                            ? 'bg-slate-950/85 text-cyan-300 border border-cyan-500/35 rounded-md font-mono'
                            : isMinimal
                              ? 'bg-white/95 text-zinc-950 rounded-none tracking-wider uppercase'
                              : isBoutique
                                ? 'bg-[#fdf8f3]/95 text-stone-900 rounded-full border border-amber-900/15'
                                : isCatalog
                                  ? 'bg-emerald-950/80 text-emerald-100 rounded-md'
                                  : 'bg-[#0e1f38]/85 text-white rounded-full'
                        }`}
                      >
                        {p.category}
                      </span>
                    )}

                    {/* Quick View Pill on Hover */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProduct(p);
                      }}
                      className={`absolute ${
                        isMinimal ? 'inset-x-3 bottom-3 py-2.5 justify-center' : `top-2.5 ${isArabic ? 'left-2.5' : 'right-2.5'} p-2`
                      } inline-flex items-center gap-1.5 text-[11px] font-extrabold opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 cursor-pointer ${
                        isTech
                          ? 'rounded-lg bg-slate-950/90 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-400 hover:text-slate-950'
                          : isMinimal
                            ? 'bg-zinc-950/90 text-white hover:bg-zinc-950'
                            : isBoutique
                              ? 'rounded-full bg-white/95 text-[#8c2f13] shadow-md hover:bg-[#8c2f13] hover:text-white'
                              : 'rounded-full bg-white/95 text-slate-800 shadow-md hover:bg-[#0084d6] hover:text-white'
                      }`}
                      aria-label={isArabic ? `معاينة ${p.name}` : `Quick view ${p.name}`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {isMinimal && <span>{isArabic ? 'معاينة سريعة' : 'Quick View'}</span>}
                    </button>

                    {/* Boutique Floating Price Pill */}
                    {isBoutique && (
                      <span
                        className={`absolute bottom-2.5 ${isArabic ? 'left-2.5' : 'right-2.5'} rounded-full bg-white/95 px-3 py-1 text-xs font-black text-[#8c2f13] shadow-md font-mono border border-amber-900/10`}
                      >
                        {formatPrice(p.price)} {currency}
                      </span>
                    )}
                  </div>

                  {/* Product Card Body */}
                  <div
                    className={`${
                      isMinimal ? 'pt-4 px-0.5' : isCatalog ? 'p-3.5' : 'p-4 sm:p-5'
                    } flex-1 flex flex-col justify-between`}
                  >
                    <div className={isBoutique ? 'text-center' : ''}>
                      <h3
                        onClick={() => setSelectedProduct(p)}
                        className={`font-black ${isCatalog ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'} leading-snug line-clamp-2 cursor-pointer transition-colors ${
                          isTech
                            ? 'text-white hover:text-cyan-300'
                            : isMinimal
                              ? 'text-zinc-950 hover:text-zinc-600'
                              : isBoutique
                                ? 'text-stone-900 hover:text-[#8c2f13]'
                                : 'text-[#0e1f38] hover:text-[#0084d6]'
                        }`}
                      >
                        {p.name}
                      </h3>

                      {!isCatalog && (
                        <p
                          className={`text-xs line-clamp-2 mt-1.5 leading-relaxed font-medium ${
                            isTech
                              ? 'text-slate-400'
                              : isMinimal
                                ? 'text-zinc-500'
                                : isBoutique
                                  ? 'text-stone-600'
                                  : 'text-slate-500'
                          }`}
                        >
                          {p.description ||
                            (isArabic ? 'جودة ممتازة وضمان كامل مع طلب مباشر.' : 'High quality guaranteed with direct ordering.')}
                        </p>
                      )}
                    </div>

                    <div
                      className={`pt-3.5 mt-3.5 border-t ${
                        isTech
                          ? 'border-slate-800'
                          : isMinimal
                            ? 'border-zinc-200/80'
                            : isBoutique
                              ? 'border-amber-900/10'
                              : 'border-slate-100'
                      } ${isCatalog || isBoutique ? 'space-y-2.5' : 'flex items-center justify-between gap-2'}`}
                    >
                      {!isBoutique && (
                        <div>
                          {!isCatalog && !isMinimal && (
                            <span className="text-[10px] block font-bold text-slate-400">{t('price_label')}</span>
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
                            <span className={`text-[11px] font-extrabold ${isTech ? 'text-slate-300' : 'text-slate-500'}`}>
                              {currency}
                            </span>
                          </span>
                        </div>
                      )}

                      {renderCardAction(p, isCatalog || isBoutique)}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* 4. ENHANCED THEMED PRODUCT QUICK-VIEW MODAL */}
      {selectedProduct && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedProduct(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm font-cairo"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`max-w-xl w-full overflow-hidden shadow-2xl border animate-fadeIn ${
              isTech
                ? 'rounded-2xl bg-[#0f172a] border-cyan-500/35 text-slate-100'
                : isMinimal
                  ? 'rounded-none bg-white border-zinc-300 text-zinc-950'
                  : isBoutique
                    ? 'rounded-3xl bg-[#fffaf4] border-amber-900/20 text-stone-900'
                    : 'rounded-3xl bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className={`relative aspect-[4/3] w-full ${isTech ? 'bg-slate-900' : isBoutique ? 'bg-[#f6ede2]' : 'bg-slate-100'}`}>
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
                className={`absolute top-3 ${isArabic ? 'left-3' : 'right-3'} w-9 h-9 rounded-full bg-white/95 text-slate-900 shadow-md flex items-center justify-center hover:bg-white cursor-pointer`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`text-xs font-black px-3 py-1 ${
                    isTech
                      ? 'rounded-md bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono'
                      : isMinimal
                        ? 'rounded-none bg-zinc-100 text-zinc-900 uppercase tracking-wider text-[11px]'
                        : isBoutique
                          ? 'rounded-full bg-amber-100 text-[#8c2f13]'
                          : isCatalog
                            ? 'rounded-lg bg-emerald-50 text-emerald-700'
                            : 'rounded-full bg-[#e6f4fe] text-[#0084d6]'
                  }`}
                >
                  {selectedProduct.category || fallbackCategory}
                </span>
                <span
                  className={`text-xl font-black font-mono ${
                    isTech
                      ? 'text-cyan-400'
                      : isMinimal
                        ? 'text-zinc-950'
                        : isBoutique
                          ? 'text-[#8c2f13]'
                          : isCatalog
                            ? 'text-emerald-700'
                            : 'text-[#0084d6]'
                  }`}
                >
                  {formatPrice(selectedProduct.price)} {currency}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-black">{selectedProduct.name}</h3>
              <p className={`text-xs sm:text-sm leading-7 font-medium ${isTech ? 'text-slate-300' : 'text-slate-600'}`}>
                {selectedProduct.description ||
                  (isArabic ? 'منتج مميز بأعلى معايير الجودة مع إمكانية الطلب المباشر.' : 'Premium product crafted with quality and direct ordering.')}
              </p>

              <div
                className={`pt-4 border-t flex flex-wrap items-center gap-3 ${
                  isTech ? 'border-slate-800' : isBoutique ? 'border-amber-900/15' : 'border-slate-100'
                }`}
              >
                <div className="flex-1">{renderCardAction(selectedProduct, true)}</div>
                {storeWhatsAppHref && (
                  <a
                    href={buildStoreWhatsAppUrl(
                      store?.whatsapp_number,
                      isArabic
                        ? `مرحبًا، أرغب في الاستفسار عن منتج "${selectedProduct.name}" (${formatPrice(selectedProduct.price)} ${currency})`
                        : `Hello, I have a question about "${selectedProduct.name}" (${formatPrice(selectedProduct.price)} ${currency})`
                    )!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-4 py-2.5 text-xs font-extrabold inline-flex items-center gap-1.5 border transition-colors ${
                      isTech
                        ? 'rounded-xl border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                        : isMinimal
                          ? 'rounded-none border-zinc-300 text-zinc-900 hover:border-zinc-950'
                          : 'rounded-2xl border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{isArabic ? 'اسأل عبر واتساب' : 'Ask on WhatsApp'}</span>
                  </a>
                )}
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

      {/* 5. THEMED STOREFRONT FOOTER */}
      <footer
        className={`w-full border-t font-cairo transition-colors ${
          isTech
            ? 'bg-[#050810] border-slate-800 text-slate-300'
            : isMinimal
              ? 'bg-white border-zinc-200 text-zinc-700'
              : isBoutique
                ? 'bg-[#361106] border-amber-900/30 text-amber-100/90'
                : isCatalog
                  ? 'bg-slate-900 border-slate-800 text-slate-300'
                  : 'bg-[#0e1f38] border-slate-800 text-slate-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Store Identity */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <img
                src={logoSrc}
                alt={store?.name || 'Store'}
                className={`w-9 h-9 object-contain p-1 ${
                  isMinimal ? 'border border-zinc-200 bg-zinc-50' : 'rounded-xl bg-white/95'
                }`}
              />
              <div>
                <strong className={`text-sm font-black block ${isMinimal ? 'text-zinc-950' : 'text-white'}`}>
                  {store?.name || t('platform_name')}
                </strong>
                <span className={`text-[11px] ${isMinimal ? 'text-zinc-500' : 'opacity-75'}`}>
                  {store?.activity_type || t('cloud_store_mgmt')}
                </span>
              </div>
            </div>
            {store?.bio && (
              <p className={`text-xs leading-6 max-w-xs ${isMinimal ? 'text-zinc-600' : 'opacity-80'}`}>
                {store.bio}
              </p>
            )}
          </div>

          {/* Quick Category Links */}
          <div className="space-y-2">
            <h4 className={`text-xs font-black uppercase tracking-wider ${isMinimal ? 'text-zinc-950' : 'text-white'}`}>
              {isArabic ? 'التصنيفات' : 'Categories'}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {categories.slice(0, 6).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    scrollToCatalog();
                  }}
                  className={`px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                    isMinimal
                      ? 'border border-zinc-200 text-zinc-700 hover:border-zinc-950 hover:text-zinc-950'
                      : 'rounded-lg bg-white/10 hover:bg-white/20 text-current'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Direct Store Contact */}
          <div className="space-y-2">
            <h4 className={`text-xs font-black uppercase tracking-wider ${isMinimal ? 'text-zinc-950' : 'text-white'}`}>
              {isArabic ? 'التواصل المباشر' : 'Direct Contact'}
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              {phone && (
                <a
                  href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors ${
                    isMinimal
                      ? 'border border-zinc-300 text-zinc-900 hover:border-zinc-950'
                      : 'rounded-lg bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span dir="ltr" className="font-mono">
                    {displayPhone}
                  </span>
                </a>
              )}
              {storeWhatsAppHref && (
                <a
                  href={storeWhatsAppHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#25d366] hover:bg-[#1ebe5b] px-3 py-1.5 text-xs font-black text-white transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'واتساب المتجر' : 'Store WhatsApp'}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        <div
          className={`border-t py-3.5 px-4 text-center text-[11px] ${
            isMinimal ? 'border-zinc-200 text-zinc-500' : 'border-white/10 text-white/60'
          }`}
        >
          developed by{' '}
          <a
            href="https://daidarsoluations.com/ar"
            className={`font-bold underline underline-offset-4 ${
              isMinimal ? 'text-zinc-900 hover:text-zinc-600' : 'text-white/90 hover:text-white'
            }`}
          >
            daidarsoluations
          </a>
        </div>
      </footer>
    </div>
  );
};
