import React, { useState } from 'react';
import { Save, Check, ShieldCheck, MessageCircle, AlertCircle, Sparkles } from 'lucide-react';
import { Store } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

interface SettingsViewProps {
  store: Store | null;
  onRefresh: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ store, onRefresh }) => {
  const { t, isArabic } = useLanguage();
  const [name, setName] = useState(store?.name || '');
  const [activityType, setActivityType] = useState(store?.activity_type || '');
  const [whatsapp, setWhatsapp] = useState(store?.whatsapp_number || '');
  const [currency, setCurrency] = useState(store?.currency || (isArabic ? 'ج.م' : '$'));
  const [bio, setBio] = useState(store?.bio || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage(isArabic ? 'يرجى إدخال اسم المتجر' : 'Please enter store name');
      return;
    }
    if (!whatsapp.trim()) {
      setErrorMessage(isArabic ? 'يرجى إدخال رقم الواتساب لضمان عمل مسار الطلبات' : 'Please enter WhatsApp number for checkout');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      setSaveSuccess(false);

      await api.saveStore({
        id: store?.id || 'store-main',
        name: name.trim(),
        activity_type: activityType.trim(),
        whatsapp_number: whatsapp.trim(),
        currency,
        bio: bio.trim(),
      });

      await onRefresh();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating settings in Cloudflare D1');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn max-w-4xl">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#0084d6] dark:text-sky-400 bg-[#e6f4fe] dark:bg-sky-950/60 px-3 py-1 rounded-full w-fit mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#0084d6] dark:text-sky-400" />
              <span>{isArabic ? 'إدارة تكوين المتجر' : 'Store Configuration'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {t('settings')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {isArabic ? 'تعديل بيانات المتجر، معلومات التواصل، مسار الواتساب، والربط بقاعدة بيانات Cloudflare D1.' : 'Update store data, WhatsApp checkout routing, and Cloudflare D1 database.'}
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs">
          <Check className="w-5 h-5 text-[#0084d6] dark:text-sky-400" />
          <span>{isArabic ? 'تم حفظ وتحديث كافة الإعدادات بنجاح في Cloudflare D1!' : 'All settings saved successfully in Cloudflare D1!'}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-10 shadow-xs space-y-6 transition-colors">
        
        {/* Basic Store Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
            {isArabic ? 'البيانات الأساسية للمتجر' : 'Basic Store Information'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                {t('store_name')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-[#0084d6] focus:ring-2 focus:ring-sky-100 text-sm font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                {t('activity_type')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-[#0084d6] focus:ring-2 focus:ring-sky-100 text-sm font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
              {isArabic ? 'نبذة مختصرة عن المتجر (Bio)' : 'Store Bio'}
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-[#0084d6] focus:ring-2 focus:ring-sky-100 text-xs sm:text-sm font-medium resize-none"
              placeholder={isArabic ? 'وصف مميزات المتجر وجودة المنتجات...' : 'Store highlights and description...'}
            />
          </div>
        </div>

        {/* WhatsApp & Checkout Configuration */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-[#0084d6] dark:text-sky-400" />
            <span>{isArabic ? 'إعدادات استلام الطلبات والواتساب (+20 10 61532875)' : 'WhatsApp Order Receiving (+20 10 61532875)'}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                {t('whatsapp_number')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-[#0084d6] focus:ring-2 focus:ring-sky-100 text-sm font-mono dir-ltr text-right"
                placeholder="201061532875"
                required
              />
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                {isArabic ? 'تأكد من كتابة رمز الدولة وبدون إشارة + أو مسافات.' : 'Country code included, without + or spaces.'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">{t('store_currency')}</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-[#0084d6] focus:ring-2 focus:ring-sky-100 text-sm font-medium"
              >
                <option value="ج.م">جنيه مصري (ج.م)</option>
                <option value="ر.س">ريال سعودي (ر.س)</option>
                <option value="د.إ">درهم إماراتي (د.إ)</option>
                <option value="د.ك">دينار كويتي (د.ك)</option>
                <option value="$">US Dollar ($)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 flex items-center justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 rounded-2xl bg-[#0084d6] hover:bg-[#0074bd] active:scale-95 text-white font-bold text-sm shadow-md shadow-sky-600/20 transition-all flex items-center gap-2 disabled:opacity-70"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isArabic ? 'حفظ التعديلات في Cloudflare D1' : 'Save Settings to Cloudflare D1'}</span>
              </>
            )}
          </button>
        </div>
      </form>

    </div>
  );
};
