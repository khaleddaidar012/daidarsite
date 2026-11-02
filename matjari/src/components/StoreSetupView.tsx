import React, { useState } from 'react';
import { ShoppingBag, ArrowLeft, CheckCircle2, Sparkles, MessageSquare, Database, Moon, Sun, Globe } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface StoreSetupViewProps {
  onComplete: (data: { name: string; activity_type: string; whatsapp_number: string; currency: string; bio: string }) => Promise<void>;
  initialName?: string;
  initialActivity?: string;
}

const ACTIVITY_PRESETS_AR = [
  'حلول رقمية وتطوير المتاجر والأنظمة البرمجية',
  'ملابس وأزياء عصرية',
  'إلكترونيات وهواتف ذكية',
  'عطور ومستحضرات تجميل',
  'مأكولات ومشروبات وحلويات',
  'حرف يدوية وهدايا',
  'أحذية وحقائب وإكسسوارات',
  'ديكور ومفروشات منزلية',
  'خدمات واستشارات',
];

const ACTIVITY_PRESETS_EN = [
  'Digital Solutions & Software Systems',
  'Modern Fashion & Apparel',
  'Electronics & Smart Devices',
  'Perfumes & Cosmetics',
  'Food, Beverages & Sweets',
  'Handmade Crafts & Gifts',
  'Shoes, Bags & Accessories',
  'Home Decor & Furniture',
  'Services & Consulting',
];

export const StoreSetupView: React.FC<StoreSetupViewProps> = ({
  onComplete,
  initialName = '',
  initialActivity = '',
}) => {
  const { isDark, toggleTheme } = useTheme();
  const { t, toggleLang, isArabic } = useLanguage();
  const presets = isArabic ? ACTIVITY_PRESETS_AR : ACTIVITY_PRESETS_EN;

  const [name, setName] = useState(initialName || '');
  const [activityType, setActivityType] = useState(initialActivity || '');
  const [whatsapp, setWhatsapp] = useState('');
  const [currency, setCurrency] = useState(isArabic ? 'ج.م' : '$');
  const [bio, setBio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(isArabic ? 'يرجى إدخال اسم المتجر للمتابعة' : 'Please enter store name to proceed');
      return;
    }
    if (!activityType.trim()) {
      setError(isArabic ? 'يرجى تحديد نوع النشاط التجاري' : 'Please select business activity type');
      return;
    }
    if (!whatsapp.trim()) {
      setError(isArabic ? 'يرجى إدخال رقم الواتساب (حقل إلزامي للتواصل واستقبال الطلبات)' : 'Please enter WhatsApp number (required for orders)');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onComplete({
        name: name.trim(),
        activity_type: activityType.trim(),
        whatsapp_number: whatsapp.trim(),
        currency,
        bio: bio.trim(),
      });

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      setError(err.message || 'Error saving settings in Cloudflare D1');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7fafe] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center py-6 sm:py-12 px-3 sm:px-6 lg:px-8 overflow-x-hidden transition-colors">
      {/* Background ambient decorative blurs in sky/cyan */}
      <div className="absolute top-10 right-1/4 w-72 h-72 bg-sky-200/40 dark:bg-sky-900/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-80 h-80 bg-blue-200/30 dark:bg-blue-900/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-xl">
        {/* Top Controls: Language */}
        <div className="flex items-center justify-end gap-2 mb-4">
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
          >
            <Globe className="w-3.5 h-3.5 text-[#0084d6] dark:text-sky-400" />
            <span>{t('lang_switch')}</span>
          </button>
        </div>

        {/* Header Badge */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e6f4fe] dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-[#0084d6] dark:text-sky-400 text-xs font-bold mb-3 sm:mb-4 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#0084d6] dark:text-sky-400" />
            <span>{t('setup_badge')}</span>
          </div>

          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center p-2 shadow-lg shadow-sky-500/10 border border-slate-100 dark:border-slate-700">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt={t('daidar_solutions')} className="w-full h-full object-contain" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('setup_title')}
          </h2>
          <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            {t('setup_desc')}
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl dark:shadow-black/60 shadow-slate-200/50 p-4 sm:p-8 lg:p-10 transition-colors">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Store Name */}
            <div>
              <label htmlFor="store-name" className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                {t('store_name')} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="store-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('store_name_placeholder')}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-[#0084d6] focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900 text-sm font-medium transition-all"
                  required
                />
                <ShoppingBag className={`w-4 h-4 text-slate-400 absolute ${isArabic ? 'left-3.5' : 'right-3.5'} top-3.5`} />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                {t('store_name_hint')}
              </p>
            </div>

            {/* 2. Business Activity Type */}
            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                {t('activity_type')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                placeholder={t('activity_placeholder')}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-[#0084d6] focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900 text-sm font-medium mb-2.5 transition-all"
                required
              />
              
              {/* Quick Preset Badges */}
              <div className="flex flex-wrap gap-1.5">
                {presets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setActivityType(preset)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      activityType === preset
                        ? 'bg-[#0084d6] text-white border-[#0084d6] font-bold'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. WhatsApp Number */}
            <div>
              <label htmlFor="store-whatsapp" className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                {t('whatsapp_number')} <span className="text-rose-500">* {t('whatsapp_required')}</span>
              </label>
              <div className="relative">
                <input
                  id="store-whatsapp"
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder={t('whatsapp_placeholder')}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-[#0084d6] focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900 text-sm font-mono dir-ltr text-right transition-all"
                  required
                />
                <MessageSquare className={`w-4 h-4 text-[#0084d6] dark:text-sky-400 absolute ${isArabic ? 'left-3.5' : 'right-3.5'} top-3.5`} />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                {t('whatsapp_hint')}
              </p>
            </div>

            {/* Currency & Subpath Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">{t('store_currency')}</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-[#0084d6] focus:ring-2 focus:ring-sky-100 text-sm font-medium"
                >
                  <option value="ج.م">جنيه مصري (ج.م)</option>
                  <option value="ر.س">ريال سعودي (ر.س)</option>
                  <option value="د.إ">درهم إماراتي (د.إ)</option>
                  <option value="$">US Dollar ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">{t('data_storage')}</label>
                <div className="px-3.5 py-2.5 rounded-xl border border-sky-200 dark:border-sky-800 bg-[#f0f7ff] dark:bg-sky-950/60 text-xs font-semibold text-[#0084d6] dark:text-sky-400 flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#0084d6] dark:text-sky-400 shrink-0" />
                  <span>{t('d1_exclusive')}</span>
                </div>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-2xl bg-[#0084d6] hover:bg-[#0074bd] active:scale-[0.99] text-white font-bold text-sm sm:text-base transition-all shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{t('save_and_create')}</span>
                  <ArrowLeft className={`w-4 h-4 ${isArabic ? 'mr-1' : 'ml-1 rotate-180'}`} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
          {t('store_path')} <code className="bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] font-mono text-slate-700 dark:text-slate-300">daidarsoluations/ar/new_test_store</code>
        </p>
      </div>
    </div>
  );
};
