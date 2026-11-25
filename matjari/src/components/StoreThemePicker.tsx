import React, { useMemo, useState } from 'react';
import { Check, Eye, Sparkles, AlertCircle, X, Save } from 'lucide-react';
import { STORE_THEMES, type StoreThemeId, type StoreThemeMeta, resolveStoreThemeId } from '../../../shared/store-themes';
import type { CartItem, Product, Store } from '../types';
import { PublicStorefront } from './PublicStorefront';

interface StoreThemePickerProps {
  value: StoreThemeId;
  savedValue?: StoreThemeId;
  onChange: (themeId: StoreThemeId) => void;
  isArabic: boolean;
  store?: Store | null;
  products?: Product[];
  onSave?: (themeId: StoreThemeId) => Promise<void>;
  compact?: boolean;
  title?: string;
  subtitle?: string;
}

const svgDataUri = (inner: string, bgStart: string, bgEnd: string) =>
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bgStart}"/><stop offset="100%" stop-color="${bgEnd}"/></linearGradient></defs><rect width="480" height="480" fill="url(#bg)"/>${inner}</svg>`
  );

// Product-only studio illustrations (no people) for realistic local preview when a store has 0 products
const SAMPLE_IMAGES = {
  headphones: svgDataUri(
    '<circle cx="240" cy="250" r="145" fill="#0ea5e9" opacity="0.12"/><path d="M135 260c0-66 47-115 105-115s105 49 105 115" fill="none" stroke="#0f172a" stroke-width="24" stroke-linecap="round"/><rect x="112" y="242" width="46" height="106" rx="22" fill="#0f172a"/><rect x="122" y="254" width="26" height="82" rx="13" fill="#38bdf8"/><rect x="322" y="242" width="46" height="106" rx="22" fill="#0f172a"/><rect x="332" y="254" width="26" height="82" rx="13" fill="#38bdf8"/><ellipse cx="240" cy="382" rx="110" ry="16" fill="#0f172a" opacity="0.12"/>',
    '#e0f2fe',
    '#f8fafc'
  ),
  perfume: svgDataUri(
    '<circle cx="240" cy="240" r="150" fill="#d97706" opacity="0.1"/><rect x="206" y="102" width="68" height="46" rx="10" fill="#292524"/><rect x="220" y="148" width="40" height="24" rx="4" fill="#d97706"/><rect x="152" y="172" width="176" height="202" rx="28" fill="#fef3c7" stroke="#b45309" stroke-width="6"/><rect x="170" y="206" width="140" height="148" rx="16" fill="#f59e0b" opacity="0.38"/><rect x="186" y="232" width="108" height="72" rx="10" fill="#fffbeb"/><rect x="206" y="254" width="68" height="10" rx="5" fill="#78350f"/><rect x="218" y="274" width="44" height="7" rx="3.5" fill="#b45309" opacity="0.7"/><ellipse cx="240" cy="396" rx="95" ry="14" fill="#451a03" opacity="0.14"/>',
    '#fef3c7',
    '#fffbeb'
  ),
  watch: svgDataUri(
    '<circle cx="240" cy="240" r="150" fill="#06b6d4" opacity="0.12"/><rect x="200" y="72" width="80" height="336" rx="22" fill="#1e293b"/><rect x="158" y="142" width="164" height="196" rx="44" fill="#0f172a" stroke="#38bdf8" stroke-width="7"/><rect x="176" y="162" width="128" height="156" rx="30" fill="#020617"/><circle cx="240" cy="240" r="44" fill="none" stroke="#22d3ee" stroke-width="8" stroke-dasharray="200 76"/><circle cx="240" cy="240" r="24" fill="#0ea5e9" opacity="0.28"/><rect x="322" y="204" width="14" height="40" rx="6" fill="#38bdf8"/>',
    '#cffafe',
    '#e2e8f0'
  ),
  bag: svgDataUri(
    '<circle cx="240" cy="250" r="148" fill="#9a3412" opacity="0.1"/><path d="M188 186v-26c0-29 23-52 52-52s52 23 52 52v26" fill="none" stroke="#7c2d12" stroke-width="16" stroke-linecap="round"/><rect x="128" y="182" width="224" height="192" rx="32" fill="#9a3412"/><path d="M128 228c0 34 50 58 112 58s112-24 112-58" fill="none" stroke="#fed7aa" stroke-width="6" opacity="0.7"/><rect x="220" y="264" width="40" height="32" rx="8" fill="#fde68a"/><ellipse cx="240" cy="396" rx="110" ry="14" fill="#431407" opacity="0.15"/>',
    '#ffedd5',
    '#faf5f0'
  ),
  coffee: svgDataUri(
    '<circle cx="240" cy="252" r="144" fill="#10b981" opacity="0.11"/><rect x="150" y="170" width="156" height="178" rx="28" fill="#ffffff" stroke="#065f46" stroke-width="8"/><path d="M306 204h26c22 0 38 16 38 38s-16 38-38 38h-26" fill="none" stroke="#065f46" stroke-width="14"/><rect x="172" y="202" width="112" height="44" rx="12" fill="#d1fae5"/><path d="M196 146c0-18 14-20 14-36M236 146c0-18 14-20 14-36" fill="none" stroke="#059669" stroke-width="8" stroke-linecap="round" opacity="0.6"/><ellipse cx="228" cy="374" rx="108" ry="15" fill="#064e3b" opacity="0.14"/>',
    '#d1fae5',
    '#f8fafc'
  ),
  lamp: svgDataUri(
    '<circle cx="240" cy="230" r="145" fill="#6366f1" opacity="0.1"/><path d="M156 226l34-106h100l34 106z" fill="#18181b"/><ellipse cx="240" cy="226" rx="84" ry="14" fill="#fde68a"/><rect x="231" y="226" width="18" height="128" rx="6" fill="#52525b"/><rect x="172" y="350" width="136" height="22" rx="11" fill="#18181b"/>',
    '#f4f4f5',
    '#e4e4e7'
  ),
};

function buildSampleProducts(isArabic: boolean): Product[] {
  return [
    {
      id: 'preview-1',
      store_id: 'preview',
      name: isArabic ? 'سماعة لاسلكية عازلة للضوضاء Pro' : 'Pro Active Noise-Cancelling Headphones',
      description: isArabic
        ? 'صوت نقي عالي الدقة مع بطارية تدوم 36 ساعة وشحن سريع.'
        : 'Studio-grade wireless audio with 36-hour battery and fast charging.',
      price: 1290,
      category: isArabic ? 'الأكثر مبيعًا' : 'Best Sellers',
      image_data: SAMPLE_IMAGES.headphones,
      is_available: 1,
    },
    {
      id: 'preview-2',
      store_id: 'preview',
      name: isArabic ? 'عطر عنبر وخشب الصندل الفاخر' : 'Amber & Sandalwood Signature Perfume',
      description: isArabic
        ? 'تركيبة فاخرة بثبات عالٍ ومظهر زجاجي أنيق للمناسبات.'
        : 'Long-lasting artisanal fragrance crafted in a luxury glass flacon.',
      price: 890,
      category: isArabic ? 'مختارات فاخرة' : 'Curated',
      image_data: SAMPLE_IMAGES.perfume,
      is_available: 1,
    },
    {
      id: 'preview-3',
      store_id: 'preview',
      name: isArabic ? 'ساعة ذكية مقاومة للماء S9' : 'Smart Fitness Watch S9 Titanium',
      description: isArabic
        ? 'شاشة AMOLED عالية السطوع وتتبع دقيق للرياضة والإشعارات.'
        : 'Bright AMOLED display with fitness tracking and instant alerts.',
      price: 1750,
      category: isArabic ? 'الأكثر مبيعًا' : 'Best Sellers',
      image_data: SAMPLE_IMAGES.watch,
      is_available: 1,
    },
    {
      id: 'preview-4',
      store_id: 'preview',
      name: isArabic ? 'حقيبة جلد طبيعي كلاسيكية' : 'Handcrafted Classic Leather Bag',
      description: isArabic
        ? 'تصميم عملي يومي بخياطة متقنة ومساحة منظمة بالكامل.'
        : 'Everyday structured tote with fine stitching and organized pockets.',
      price: 960,
      category: isArabic ? 'وصل حديثًا' : 'New Arrivals',
      image_data: SAMPLE_IMAGES.bag,
      is_available: 1,
    },
    {
      id: 'preview-5',
      store_id: 'preview',
      name: isArabic ? 'طقم كوب سيراميك مختص للقهوة' : 'Artisan Ceramic Coffee Mug Set',
      description: isArabic
        ? 'ملمس ناعم وحفظ مثالي للحرارة بتصميم عصري هادئ.'
        : 'Minimal matte glaze engineered for heat retention and daily rituals.',
      price: 340,
      category: isArabic ? 'وصل حديثًا' : 'New Arrivals',
      image_data: SAMPLE_IMAGES.coffee,
      is_available: 1,
    },
    {
      id: 'preview-6',
      store_id: 'preview',
      name: isArabic ? 'مصباح مكتب عصري بإضاءة دافئة' : 'Minimal Architectural Desk Lamp',
      description: isArabic
        ? 'إضاءة مريحة للعين مع تحكم تدريجي في السطوع.'
        : 'Warm diffused ambient glow with precision matte finish.',
      price: 620,
      category: isArabic ? 'مختارات فاخرة' : 'Curated',
      image_data: SAMPLE_IMAGES.lamp,
      is_available: 1,
    },
  ];
}

const ThemeMiniPreview: React.FC<{ theme: StoreThemeMeta }> = ({ theme }) => {
  if (theme.id === 'tech') {
    return (
      <div
        aria-hidden="true"
        className="relative h-32 w-full overflow-hidden rounded-xl border border-slate-700 bg-[#070b14] p-2 flex flex-col justify-between"
      >
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="h-1.5 w-10 rounded-full bg-cyan-300/80" />
          </div>
          <span className="h-3 w-7 rounded bg-cyan-400" />
        </div>
        <div className="grid grid-cols-[1.2fr_0.8fr] gap-1.5 my-1">
          <div className="space-y-1 flex flex-col justify-center">
            <span className="h-1.5 w-14 rounded bg-white" />
            <span className="h-1 w-10 rounded bg-slate-400" />
            <div className="flex gap-1 pt-0.5">
              <span className="h-2.5 w-7 rounded bg-cyan-400" />
              <span className="h-2.5 w-6 rounded border border-slate-700 bg-slate-900" />
            </div>
          </div>
          <div className="rounded-lg border border-cyan-500/35 bg-[#111827] p-1 flex flex-col justify-between">
            <span className="h-6 w-full rounded bg-cyan-500/20" />
            <span className="h-1 w-8 rounded bg-cyan-300 mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded border border-slate-800 bg-[#111827] p-1 space-y-1">
              <span className="block h-3.5 rounded bg-slate-800" />
              <span className="block h-1 w-3/4 rounded bg-cyan-400/75" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (theme.id === 'minimal') {
    return (
      <div
        aria-hidden="true"
        className="relative h-32 w-full overflow-hidden rounded-xl border border-zinc-200 bg-[#fafaf8] flex flex-col justify-between"
      >
        <div className="h-2.5 w-full bg-zinc-950" />
        <div className="px-2.5 pt-1 flex items-center justify-between border-b border-zinc-200 pb-1">
          <span className="h-1.5 w-5 bg-zinc-300" />
          <span className="h-2 w-12 bg-zinc-950" />
          <span className="h-2.5 w-5 bg-zinc-950" />
        </div>
        <div className="px-2.5 py-1 text-center flex flex-col items-center gap-1">
          <span className="h-1.5 w-16 bg-zinc-950" />
          <span className="h-1 w-12 bg-zinc-400" />
          <span className="h-2.5 w-10 bg-zinc-950 mt-0.5" />
        </div>
        <div className="px-2.5 pb-2 grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1">
              <span className="block h-6 w-full bg-zinc-200 border border-zinc-300/70" />
              <span className="block h-1 w-2/3 bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (theme.id === 'boutique') {
    return (
      <div
        aria-hidden="true"
        className="relative h-32 w-full overflow-hidden rounded-xl border border-amber-900/20 bg-[#fbf5ee] flex flex-col justify-between"
      >
        <div className="h-2.5 w-full bg-[#431407]" />
        <div className="px-2 pt-1 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-[#8c2f13]" />
            <span className="h-1.5 w-10 rounded-full bg-stone-800" />
          </div>
          <span className="h-2.5 w-6 rounded-full bg-[#8c2f13]" />
        </div>
        <div className="mx-2 rounded-xl border border-amber-900/20 bg-gradient-to-br from-[#f5e3d0] to-[#fff9f2] p-1.5 grid grid-cols-[1.2fr_0.8fr] gap-1.5 items-center">
          <div className="space-y-1">
            <span className="block h-1.5 w-14 rounded-full bg-stone-900" />
            <span className="block h-2 w-8 rounded-full bg-[#8c2f13]" />
          </div>
          <div className="rounded-lg bg-white p-1 border border-amber-900/15">
            <span className="block h-5 rounded bg-amber-200/70" />
          </div>
        </div>
        <div className="px-2 pb-1.5 grid grid-cols-3 gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-amber-900/15 bg-white p-1 space-y-1">
              <span className="block h-4 rounded bg-[#f5e6d7]" />
              <span className="block h-1 w-3/4 mx-auto rounded-full bg-[#8c2f13]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (theme.id === 'catalog') {
    return (
      <div
        aria-hidden="true"
        className="relative h-32 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 flex flex-col justify-between"
      >
        <div className="h-1 w-full bg-emerald-600" />
        <div className="bg-white px-2 py-1.5 border-b border-slate-200 flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-600 shrink-0" />
          <span className="h-3 flex-1 rounded bg-slate-100 border border-slate-200" />
          <span className="h-3 w-7 rounded bg-emerald-600 shrink-0" />
        </div>
        <div className="px-2 flex items-center gap-1">
          <span className="h-2.5 w-8 rounded bg-emerald-600" />
          <span className="h-2.5 w-7 rounded bg-white border border-slate-200" />
          <span className="h-2.5 w-7 rounded bg-white border border-slate-200" />
        </div>
        <div className="px-2 pb-2 grid grid-cols-4 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded bg-white border border-slate-200 p-1 space-y-1">
              <span className="block h-4 rounded bg-emerald-100" />
              <span className="block h-1 w-4/5 rounded bg-slate-700" />
              <span className="block h-1.5 w-full rounded bg-emerald-600" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Classic Modern Commerce
  return (
    <div
      aria-hidden="true"
      className="relative h-32 w-full overflow-hidden rounded-xl border border-sky-200 bg-[#f4f9fe] flex flex-col justify-between"
    >
      <div className="h-2.5 w-full bg-gradient-to-l from-[#0e1f38] to-[#0084d6]" />
      <div className="px-2 py-1 bg-white/95 border-b border-sky-100 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-lg bg-[#0084d6]" />
          <span className="h-1.5 w-10 rounded-full bg-[#0e1f38]" />
        </div>
        <span className="h-3 w-7 rounded-lg bg-[#0084d6]" />
      </div>
      <div className="px-2 grid grid-cols-[1.2fr_0.8fr] gap-1.5 items-center">
        <div className="space-y-1">
          <span className="block h-1.5 w-14 rounded-full bg-[#0e1f38]" />
          <span className="block h-1 w-10 rounded-full bg-slate-400" />
          <span className="block h-2.5 w-9 rounded-full bg-[#0084d6]" />
        </div>
        <div className="rounded-lg bg-white p-1 border border-sky-100 shadow-sm">
          <span className="block h-5 rounded bg-sky-100" />
        </div>
      </div>
      <div className="px-2 pb-1.5 grid grid-cols-3 gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-sky-100 bg-white p-1 space-y-1">
            <span className="block h-4 rounded bg-sky-50" />
            <span className="block h-1 w-3/4 rounded-full bg-[#0084d6]" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const StoreThemePicker: React.FC<StoreThemePickerProps> = ({
  value,
  savedValue,
  onChange,
  isArabic,
  store,
  products = [],
  onSave,
  compact = false,
  title,
  subtitle,
}) => {
  const [previewTheme, setPreviewTheme] = useState<StoreThemeId | null>(null);
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [previewCart, setPreviewCart] = useState<CartItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState('');
  const [saveError, setSaveError] = useState('');

  const text = (a: string, b: string) => (isArabic ? a : b);
  const selectedTheme = resolveStoreThemeId(value);
  const currentSaved = savedValue ? resolveStoreThemeId(savedValue) : undefined;
  const hasUnsavedChange = !!onSave && !!currentSaved && selectedTheme !== currentSaved;

  const previewStore: Store = useMemo(
    () =>
      store || {
        id: 'preview-store',
        name: text('متجرك الإلكتروني', 'Your Online Store'),
        activity_type: text('معاينة تصميم المتجر', 'Store Theme Preview'),
        whatsapp_number: '201000000000',
        currency: isArabic ? 'ج.م' : '$',
        bio: text(
          'هكذا سيظهر اسم متجرك ووصفه ومنتجاته لعملائك بتجربة تسوق متكاملة وطلب مباشر عبر واتساب.',
          'This is how your store name, bio, and products will appear to shoppers with direct WhatsApp ordering.'
        ),
        facebook_url: '',
        is_active: 1,
        effective_status: 'active',
        theme_id: selectedTheme,
      },
    [store, isArabic, selectedTheme]
  );

  const previewProducts = useMemo(
    () => (products.length > 0 ? products : buildSampleProducts(isArabic)),
    [products, isArabic]
  );

  const handlePreviewAdd = (product: Product) => {
    setPreviewCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handlePreviewUpdateQty = (productId: string, delta: number) => {
    setPreviewCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  async function handleSaveTheme() {
    if (!onSave || saving) return;
    setSaving(true);
    setSaveError('');
    setSaveNotice('');
    try {
      await onSave(selectedTheme);
      setSaveNotice(text('تم حفظ وتطبيق ثيم المتجر بنجاح.', 'Store theme saved and applied successfully.'));
      window.setTimeout(() => setSaveNotice(''), 4000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : text('تعذر حفظ الثيم. حاول مرة أخرى.', 'Could not save theme. Try again.'));
    } finally {
      setSaving(false);
    }
  }

  function handleCancelChanges() {
    if (currentSaved) {
      onChange(currentSaved);
      setSaveError('');
      setSaveNotice('');
    }
  }

  return (
    <section
      dir={isArabic ? 'rtl' : 'ltr'}
      className={compact ? 'space-y-3' : 'rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4'}
      aria-label={text('اختيار ثيم المتجر', 'Store theme selection')}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className={compact ? 'text-xs sm:text-sm font-black text-slate-900' : 'text-base sm:text-lg font-black text-slate-900 flex items-center gap-2'}>
            {!compact && <Sparkles className="w-4 h-4 text-[#0084d6]" />}
            <span>{title || text('اختر تصميم (ثيم) متجرك', 'Choose your store theme')}</span>
          </h3>
          <p className="mt-1 text-xs text-slate-500 leading-6">
            {subtitle ||
              text(
                '5 ثيمات احترافية مختلفة الهوية والتخطيط بالكامل. يمكنك معاينة أي ثيم وتجربته حيًا قبل الحفظ وتغييره في أي وقت من الإعدادات.',
                '5 distinct storefront themes with rich layouts and shopping flows. Preview interactively before saving and switch anytime from Settings.'
              )}
          </p>
        </div>
      </div>

      {saveNotice && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{saveNotice}</span>
        </div>
      )}

      {saveError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{saveError}</span>
        </div>
      )}

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {STORE_THEMES.map((theme) => {
          const isSelected = selectedTheme === theme.id;
          const isCurrentSaved = currentSaved === theme.id;

          return (
            <div
              key={theme.id}
              data-theme-option={theme.id}
              className={`rounded-2xl border p-3.5 transition-all flex flex-col justify-between gap-3 ${
                isSelected
                  ? 'border-[#0084d6] bg-sky-50/50 ring-2 ring-[#0084d6]/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="space-y-2.5">
                <ThemeMiniPreview theme={theme} />
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <strong className="text-sm font-black text-slate-900">
                    {isArabic ? theme.nameAr : theme.nameEn}
                  </strong>
                  <div className="flex items-center gap-1">
                    {isCurrentSaved && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                        {text('الحالي', 'Current')}
                      </span>
                    )}
                    {isSelected && (
                      <span className="rounded-full bg-[#0084d6] px-2 py-0.5 text-[10px] font-extrabold text-white">
                        {text('مختار', 'Selected')}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[11px] leading-5 text-slate-600">
                  {isArabic ? theme.descriptionAr : theme.descriptionEn}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setSaveError('');
                    onChange(theme.id);
                  }}
                  aria-pressed={isSelected}
                  className={`flex-1 min-h-9 rounded-xl px-3 py-2 text-xs font-extrabold transition cursor-pointer disabled:opacity-60 ${
                    isSelected
                      ? 'bg-[#0084d6] text-white'
                      : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {isSelected ? text('تم الاختيار', 'Selected') : text('اختيار', 'Select')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewViewport('desktop');
                    setPreviewCart([]);
                    setPreviewTheme(theme.id);
                  }}
                  className="inline-flex min-h-9 items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{text('معاينة', 'Preview')}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {onSave && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            {hasUnsavedChange
              ? text('لديك تغيير غير محفوظ في الثيم. اضغط «حفظ وتطبيق الثيم» لاعتماده للزوار.', 'You have an unsaved theme change. Click Save & apply to publish it.')
              : text('الثيم الحالي مطبّق على واجهة متجرك العامة.', 'Your current theme is active on your public storefront.')}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {hasUnsavedChange && (
              <button
                type="button"
                disabled={saving}
                onClick={handleCancelChanges}
                className="min-h-10 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                {text('إلغاء التغيير', 'Cancel')}
              </button>
            )}
            <button
              type="button"
              disabled={saving || !hasUnsavedChange}
              onClick={() => void handleSaveTheme()}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0084d6] hover:bg-[#0074bd] px-5 py-2 text-xs font-black text-white shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? text('جارٍ حفظ الثيم…', 'Saving theme…') : text('حفظ وتطبيق الثيم', 'Save & apply theme')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Interactive Live Preview Modal (Desktop & Mobile) */}
      {previewTheme && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={text('معاينة ثيم المتجر', 'Store theme preview')}
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/75 backdrop-blur-sm p-2 sm:p-4"
        >
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-sky-300">{text('معاينة تفاعلية للثيم', 'Interactive Theme Preview')}</span>
                <div className="flex flex-wrap gap-1">
                  {STORE_THEMES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPreviewTheme(item.id)}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold cursor-pointer transition ${
                        previewTheme === item.id ? 'bg-sky-500 text-white' : 'bg-white/10 text-slate-200 hover:bg-white/20'
                      }`}
                    >
                      {isArabic ? item.nameAr : item.nameEn}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg bg-white/10 p-0.5 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setPreviewViewport('desktop')}
                    className={`rounded-md px-2.5 py-1 cursor-pointer ${previewViewport === 'desktop' ? 'bg-white text-slate-900' : 'text-slate-200'}`}
                  >
                    {text('كمبيوتر', 'Desktop')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewViewport('mobile')}
                    className={`rounded-md px-2.5 py-1 cursor-pointer ${previewViewport === 'mobile' ? 'bg-white text-slate-900' : 'text-slate-200'}`}
                  >
                    {text('هاتف', 'Mobile')}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onChange(previewTheme);
                    setPreviewTheme(null);
                  }}
                  className="rounded-lg bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 text-xs font-black text-white cursor-pointer"
                >
                  {text('اختيار هذا الثيم', 'Choose this theme')}
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTheme(null)}
                  aria-label={text('إغلاق المعاينة', 'Close preview')}
                  className="rounded-lg bg-white/10 hover:bg-white/20 p-1.5 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {products.length === 0 && (
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-[11px] font-bold text-amber-900">
                {text(
                  'معاينة تفاعلية بمنتجات توضيحية محلية فقط لأن متجرك لا يحتوي على منتجات بعد — لن تُحفظ أو تُنشر هذه البيانات.',
                  'Interactive preview with local sample products because your store has no products yet — sample items are never saved or published.'
                )}
              </div>
            )}

            {/* Preview Viewport Frame */}
            <div className="flex-1 overflow-y-auto bg-slate-200 p-2 sm:p-4">
              <div
                className={
                  previewViewport === 'mobile'
                    ? 'mx-auto max-w-[390px] overflow-hidden rounded-[2rem] border-4 border-slate-800 bg-white shadow-2xl'
                    : 'mx-auto w-full overflow-hidden rounded-xl border border-slate-300 bg-white shadow-lg'
                }
              >
                <PublicStorefront
                  store={previewStore}
                  products={previewProducts}
                  cart={previewCart}
                  onAddToCart={handlePreviewAdd}
                  onUpdateQuantity={handlePreviewUpdateQty}
                  onOpenCart={() => {}}
                  onBackToDashboard={() => setPreviewTheme(null)}
                  themeOverride={previewTheme}
                  embeddedPreview
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
