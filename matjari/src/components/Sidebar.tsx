import React from 'react';
import { BarChart3, Package, CreditCard, Settings, X, Database } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export type TabType = 'general' | 'products' | 'payments' | 'settings';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  productCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  productCount = 0,
}) => {
  const { t, isArabic } = useLanguage();

  const navItems = [
    {
      id: 'general' as TabType,
      label: t('general_info'),
      subtitle: t('general_info_sub'),
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'products' as TabType,
      label: t('products_prices'),
      subtitle: t('products_sub'),
      icon: Package,
      badge: productCount > 0 ? `${productCount}` : null,
    },
    {
      id: 'payments' as TabType,
      label: t('payment_methods'),
      subtitle: t('payment_sub'),
      icon: CreditCard,
      badge: t('coming_soon'),
      badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    },
    {
      id: 'settings' as TabType,
      label: t('settings'),
      subtitle: t('settings_sub'),
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Fixed Sidebar on the Right Side (or Left in LTR) */}
      <aside
        className={`fixed top-0 ${isArabic ? 'right-0 border-l' : 'left-0 border-r'} z-50 h-screen w-72 bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : isArabic ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img 
              src={`${import.meta.env.BASE_URL}logo.png`} 
              alt={t('daidar_solutions')} 
              className="w-8 h-8 rounded-lg object-contain shadow-xs bg-white dark:bg-slate-800 p-0.5" 
            />
            <div>
              <span className="font-extrabold text-slate-900 dark:text-white text-base block">{t('daidar_solutions')}</span>
              <span className="text-[10px] block text-[#0084d6] dark:text-sky-400 font-bold -mt-0.5">{t('dashboard_d1')}</span>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2">
          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {t('main_sections')}
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full text-start flex items-center justify-between p-3.5 rounded-2xl transition-all font-medium text-sm group cursor-pointer ${
                    isActive
                      ? 'bg-[#0084d6] text-white font-black shadow-lg shadow-sky-600/25'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 group-hover:text-[#0084d6]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`truncate ${isActive ? 'text-white font-black' : 'font-extrabold'}`}>
                          {idx + 1}. {item.label}
                        </span>
                      </div>
                      <span className={`text-[11px] block font-medium truncate mt-0.5 ${isActive ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'}`}>
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white border-white/30'
                          : item.badgeClass || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Database Notice */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-[#f8fafc] dark:bg-slate-900/50">
          <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 shadow-xs">
            <div className="flex items-center gap-2 text-[#0084d6] dark:text-sky-400 font-semibold mb-1">
              <Database className="w-3.5 h-3.5" />
              <span>{t('d1_database')}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('d1_note')}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
