import React from 'react';
import { Eye, ShieldCheck, Database, Menu, X, Moon, Sun, Globe } from 'lucide-react';
import { Store } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface NavbarProps {
  store: Store | null;
  onViewStore: () => void;
  isPublicView: boolean;
  onToggleSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  store,
  onViewStore,
  isPublicView,
  onToggleSidebar,
  isMobileSidebarOpen
}) => {
  const { isDark, toggleTheme } = useTheme();
  const { t, toggleLang, isArabic } = useLanguage();
  const logoSrc = store?.logo_data || `${import.meta.env.BASE_URL}logo.png`;

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 transition-colors">
      <div className="flex items-center justify-between gap-2 sm:gap-4 max-w-7xl mx-auto w-full">
        
        {/* Left Side: Hamburger (Mobile) + Logo + Store Name */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {!isPublicView && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              aria-label={t('menu')}
              title={t('menu')}
            >
              {isMobileSidebarOpen ? <X className="w-5 h-5 text-slate-800 dark:text-white" /> : <Menu className="w-5 h-5 text-slate-800 dark:text-white" />}
            </button>
          )}

          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img
              src={logoSrc}
              alt={t('daidar_solutions')}
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-xl shadow-xs bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base lg:text-lg leading-tight truncate max-w-[110px] xs:max-w-[150px] sm:max-w-xs md:max-w-sm">
                  {store?.name || t('daidar_solutions')}
                </h1>
                <span className="inline-flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-[11px] font-bold bg-[#e6f4fe] dark:bg-sky-950/60 text-[#0084d6] dark:text-sky-400 border border-sky-100 dark:border-sky-800 px-1.5 sm:px-2 py-0.5 rounded-full shrink-0">
                  <ShieldCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#0084d6] dark:text-sky-400" />
                  <span>{t('active')}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:flex items-center gap-1.5 truncate">
                <span className="truncate">{store?.activity_type || t('cloud_store_mgmt')}</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="inline-flex items-center gap-1 text-[10px] text-[#0084d6] dark:text-sky-400 font-medium shrink-0">
                  <Database className="w-2.5 h-2.5" />
                  Cloudflare D1
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Action Area: Language Toggle + Quick Action Button */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Language Switcher (Arabic / English) */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            title={t('lang_switch')}
            aria-label="Toggle language"
          >
            <Globe className="w-3.5 h-3.5 text-[#0084d6] dark:text-sky-400" />
            <span>{t('lang_switch')}</span>
          </button>

          {/* Quick Action Button: "شوف المتجر دلوقتي" */}
          <button
            onClick={() => {
              if (store?.id) {
                const storeUrl = `${window.location.origin}${window.location.pathname}?store_id=${store.id}&view=storefront`;
                window.open(storeUrl, '_blank');
              }
              onViewStore();
            }}
            id="view-store-button"
            className="group relative inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#0084d6] hover:bg-[#0074bd] active:scale-[0.98] transition-all shadow-md shadow-sky-600/25 border border-sky-400/40 shrink-0 whitespace-nowrap"
            title={t('view_store_now')}
          >
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-100 group-hover:scale-110 transition-transform" />
            <span>{t('view_store_now')}</span>
            <span className="relative flex h-2 w-2 mr-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-200 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
          </button>
        </div>

      </div>
    </header>
  );
};
