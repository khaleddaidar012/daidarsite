import React, { useMemo, useState } from 'react';
import { Check, Eye, Sparkles, AlertCircle, X, Save } from 'lucide-react';
import { STORE_THEMES, type StoreThemeId, type StoreThemeMeta, resolveStoreThemeId } from '../../../shared/store-themes';
import type { Product, Store } from '../types';
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

const PREVIEW_SAMPLE_SVG = (bg: string, fg: string) =>
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="${bg}"/><rect x="110" y="105" width="180" height="190" rx="28" fill="${fg}" opacity="0.22"/><circle cx="200" cy="185" r="46" fill="${fg}" opacity="0.45"/><rect x="145" y="248" width="110" height="18" rx="9" fill="${fg}" opacity="0.5"/></svg>`
  );

function buildSampleProducts(isArabic: boolean): Product[] {
  return [
    {
      id: 'preview-1',
      store_id: 'preview',
      name: isArabic ? 'منتج توضيحي أول' : 'Sample Product One',
      description: isArabic ? 'مثال محلي للمعاينة فقط — لن يُحفظ في متجرك.' : 'Local preview sample only — not saved to your store.',
      price: 290,
      category: isArabic ? 'الأكثر طلبًا' : 'Featured',
      image_data: PREVIEW_SAMPLE_SVG('#e0f2fe', '#0284c7'),
      is_available: 1,
    },
    {
      id: 'preview-2',
      store_id: 'preview',
      name: isArabic ? 'منتج توضيحي ثاني' : 'Sample Product Two',
      description: isArabic ? 'يعرض شكل السعر والصورة داخل هذا الثيم.' : 'Shows how price and photography appear in this theme.',
      price: 450.5,
      category: isArabic ? 'وصل حديثًا' : 'New Arrivals',
      image_data: PREVIEW_SAMPLE_SVG('#fef3c7', '#b45309'),
      is_available: 1,
    },
    {
      id: 'preview-3',
      store_id: 'preview',
      name: isArabic ? 'منتج توضيحي ثالث' : 'Sample Product Three',
      description: isArabic ? 'معاينة توزيع الشبكة والأزرار على المقاس المختار.' : 'Previews card grid density and actions.',
      price: 185,
      category: isArabic ? 'الأكثر طلبًا' : 'Featured',
      image_data: PREVIEW_SAMPLE_SVG('#dcfce7', '#059669'),
      is_available: 1,
    },
  ];
}

const ThemeMiniPreview: React.FC<{ theme: StoreThemeMeta }> = ({ theme }) => {
  const [bg, accent, ink] = theme.swatches;
  const cardBg = theme.isDark ? '#111827' : '#ffffff';
  const borderCol = theme.isDark ? '#1f2937' : '#e2e8f0';

  return (
    <div
      aria-hidden="true"
      className="relative h-28 w-full overflow-hidden rounded-xl border p-2.5 flex flex-col justify-between"
      style={{ backgroundColor: bg, borderColor: borderCol }}
    >
      {/* Mini Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: accent }} />
          <span className="h-2 w-12 rounded-full opacity-80" style={{ backgroundColor: ink }} />
        </div>
        <span className="h-3.5 w-8 rounded-full" style={{ backgroundColor: accent }} />
      </div>

      {/* Mini Hero */}
      {theme.layoutStyle === 'editorial' || theme.layoutStyle === 'lookbook' ? (
        <div
          className="my-1 rounded-lg px-2 py-1.5 text-center flex flex-col items-center gap-1"
          style={{
            backgroundColor: theme.layoutStyle === 'lookbook' ? '#f4e4d4' : 'transparent',
            border: theme.layoutStyle === 'lookbook' ? '1px solid rgba(154,52,18,0.18)' : 'none',
          }}
        >
          <span className="h-1.5 w-16 rounded-full" style={{ backgroundColor: ink }} />
          <span className="h-1 w-10 rounded-full opacity-50" style={{ backgroundColor: accent }} />
        </div>
      ) : (
        <div className="my-1 flex items-center justify-between gap-2">
          <div className="space-y-1">
            <span className="block h-1.5 w-16 rounded-full" style={{ backgroundColor: ink }} />
            <span className="block h-1 w-11 rounded-full opacity-50" style={{ backgroundColor: ink }} />
          </div>
          <span className="h-3 w-7 rounded-md opacity-25" style={{ backgroundColor: accent }} />
        </div>
      )}

      {/* Mini Product Grid */}
      <div
        className={`grid gap-1.5 ${
          theme.layoutStyle === 'editorial' || theme.layoutStyle === 'lookbook' ? 'grid-cols-3' : 'grid-cols-4'
        }`}
      >
        {Array.from({ length: theme.layoutStyle === 'editorial' || theme.layoutStyle === 'lookbook' ? 3 : 4 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-md p-1 flex flex-col gap-1 border"
            style={{ backgroundColor: cardBg, borderColor: borderCol }}
          >
            <span
              className={`block w-full rounded-xs opacity-20 ${
                theme.layoutStyle === 'lookbook' ? 'h-5' : 'h-3.5'
              }`}
              style={{ backgroundColor: accent }}
            />
            <span className="block h-1 w-3/4 rounded-full opacity-70" style={{ backgroundColor: ink }} />
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
        whatsapp_number: '',
        currency: isArabic ? 'ج.م' : '$',
        bio: text('هكذا سيظهر اسم متجرك ووصفه ومنتجاته لعملائك.', 'This is how your store name, bio, and products will look to shoppers.'),
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
                '5 ثيمات احترافية مختلفة التخطيط والألوان. يمكنك المعاينة قبل الحفظ وتغيير الثيم في أي وقت من الإعدادات.',
                '5 distinct professional storefront themes. Preview before saving and switch anytime from Settings.'
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

      <div className={`grid gap-3 ${compact ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
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
          className="fixed inset-0 z-50 flex flex-col bg-slate-950/75 backdrop-blur-xs p-2 sm:p-4"
        >
          <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-sky-300">{text('معاينة حية للثيم', 'Live Theme Preview')}</span>
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
                  'معاينة بمنتجات توضيحية محلية فقط لأن متجرك لا يحتوي على منتجات بعد — لن تُحفظ أو تُنشر هذه البيانات.',
                  'Showing local sample products for preview because your store has no products yet — sample items are never saved or published.'
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
                  cart={[]}
                  onAddToCart={() => {}}
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
