import React, { useState } from 'react';
import { Store, Product } from '../types';
import { Store as StoreIcon, Plus, ArrowLeft, Search, ShieldCheck, Sparkles, Moon, Sun, Globe } from 'lucide-react';
import { Footer } from './Footer';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface ExploreStoresViewProps {
  stores: Store[];
  onSelectStore: (store: Store) => void;
  onManageStore: (store: Store) => void;
  onCreateStore: () => void;
  onBackToHome: () => void;
}

export const ExploreStoresView: React.FC<ExploreStoresViewProps> = ({
  stores,
  onSelectStore,
  onManageStore,
  onCreateStore,
  onBackToHome,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { isDark, toggleTheme } = useTheme();
  const { t, toggleLang, isArabic } = useLanguage();
  const [selectedActivity, setSelectedActivity] = useState<string>(t('all'));

  const activities = [t('all'), ...Array.from(new Set(stores.map((s) => s.activity_type)))];

  const filteredStores = stores.filter((s) => {
    const matchesActivity = selectedActivity === t('all') || s.activity_type === selectedActivity;
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.activity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.bio && s.bio.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesActivity && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#f7fafe] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between selection:bg-sky-100 selection:text-sky-900 transition-colors">
      
      {/* Top Header */}
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 shadow-2xs sticky top-0 z-30 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={onBackToHome}
              className="p-1.5 sm:p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              title={t('back_home')}
            >
              <ArrowLeft className={`w-5 h-5 ${isArabic ? 'rotate-180' : ''}`} />
            </button>

            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <img 
                src={`${import.meta.env.BASE_URL}logo.png`} 
                alt={t('daidar_solutions')} 
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-xl shrink-0 bg-white dark:bg-slate-800 p-0.5" 
              />
              <div className="min-w-0">
                <h1 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-lg leading-tight truncate">
                  {t('stores_directory')}
                </h1>
                <span className="text-[10px] sm:text-[11px] text-[#0084d6] dark:text-sky-400 font-bold block -mt-0.5 truncate">
                  {t('explore_subtitle')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Language Toggle */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-[#0084d6] dark:text-sky-400" />
              <span>{t('lang_switch')}</span>
            </button>

            {/* Create Store Button - إنشاء متجر */}
            <button
              onClick={onCreateStore}
              className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-[#0084d6] hover:bg-[#0074bd] text-white font-bold text-xs sm:text-sm shadow-md shadow-sky-600/20 active:scale-95 transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span><span className="hidden sm:inline">{t('buy_store')} / </span>{t('new_store')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section of Directory */}
      <section className="bg-gradient-to-b from-white to-[#f7fafe] dark:from-slate-900 dark:to-slate-950 border-b border-slate-200/80 dark:border-slate-800 py-10 px-4 sm:px-8 transition-colors">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#e6f4fe] dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-[#0084d6] dark:text-sky-400 text-xs font-bold shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('setup_badge')}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('explore_hero_title')}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {t('explore_hero_desc')}
          </p>

          {/* Quick Action Split Buttons - إنشاء متجر */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onCreateStore}
              className="px-6 py-3 rounded-2xl bg-[#0084d6] hover:bg-[#0074bd] text-white font-black text-sm shadow-lg shadow-sky-600/25 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t('create_new_store')}</span>
            </button>

            <button
              onClick={onBackToHome}
              className="px-6 py-3 rounded-2xl bg-[#0e1f38] dark:bg-slate-800 hover:bg-[#152a4a] dark:hover:bg-slate-700 text-white font-bold text-sm shadow-md shadow-slate-900/10 active:scale-95 transition-all"
            >
              {t('main_page')}
            </button>
          </div>
        </div>
      </section>

      {/* Main Directory Catalog */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 w-full flex-1">
        {/* Search & Filter pills */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
          
          {/* Activity Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {activities.map((act) => (
              <button
                key={act}
                onClick={() => setSelectedActivity(act)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedActivity === act
                    ? 'bg-[#0084d6] text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
                }`}
              >
                {act}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px] md:w-80">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('search_stores')}
              className="w-full px-4 py-2.5 pl-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-medium focus:border-[#0084d6] focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900 transition-all shadow-2xs"
            />
            <Search className={`w-4 h-4 text-slate-400 absolute ${isArabic ? 'left-3' : 'right-3'} top-3`} />
          </div>
        </div>

        {/* Stores Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStores.map((store) => (
            <div
              key={store.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs hover:shadow-lg dark:hover:shadow-black/60 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Store Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#e6f4fe] dark:bg-sky-950/60 text-[#0084d6] dark:text-sky-400 flex items-center justify-center font-black text-lg border border-sky-100 dark:border-sky-800 shadow-2xs">
                      {store.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight group-hover:text-[#0084d6] dark:group-hover:text-sky-400 transition-colors">
                        {store.name}
                      </h3>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {store.activity_type}
                      </span>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#e6f4fe] dark:bg-sky-950/60 text-[#0084d6] dark:text-sky-400 px-2 py-0.5 rounded-full border border-sky-100 dark:border-sky-800">
                    <ShieldCheck className="w-3 h-3" />
                    {t('active_badge')}
                  </span>
                </div>

                {/* Bio */}
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed mb-4">
                  {store.bio || 'متجر إلكتروني معتمد يقدم أفضل المنتجات والخدمات مع الطلب المباشر عبر واتساب.'}
                </p>

                {/* Details Pills */}
                <div className="flex flex-wrap gap-2 text-xs mb-4">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] border border-slate-200 dark:border-slate-700">
                    {t('currency_label')} {store.currency}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] border border-slate-200 dark:border-slate-700 dir-ltr text-right">
                    📞 {store.whatsapp_number}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                {/* Visit Public Storefront Button */}
                <button
                  onClick={() => onSelectStore(store)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#0084d6] hover:bg-[#0074bd] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
                >
                  <StoreIcon className="w-3.5 h-3.5" />
                  <span>{t('visit_store')}</span>
                </button>

                {/* Manage Store / Vendor Dashboard Button */}
                <button
                  onClick={() => onManageStore(store)}
                  className="py-2.5 px-3 rounded-xl bg-[#0e1f38] dark:bg-slate-800 hover:bg-[#152a4a] dark:hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-2xs active:scale-95"
                  title="الدخول إلى لوحة تحكم التاجر لهذا المتجر"
                >
                  <span>{t('control_panel')} ⚙️</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <Footer facebookUrl="https://www.facebook.com/daidarsoluations/" storeName="دعيدر للحلول البرمجية — منصة متجري" />
    </div>
  );
};
