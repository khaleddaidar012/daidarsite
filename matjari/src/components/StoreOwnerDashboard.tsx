import React, { useState, useEffect } from 'react';
import { Store, Product, Subscription, User } from '../types';
import { api } from '../services/api';
import {
  ExternalLink,
  Copy,
  Check,
  LogOut,
  Globe,
  Sparkles,
  Home,
  Menu,
  Activity,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Sidebar, TabType } from './Sidebar';
import { GeneralInfoView } from './GeneralInfoView';
import { ProductsView } from './ProductsView';
import { PaymentMethodsView } from './PaymentMethodsView';
import { SettingsView } from './SettingsView';

interface StoreOwnerDashboardProps {
  user: User;
  initialStore: Store | null;
  subscription: Subscription | null;
  onLogout: () => void;
  onPreviewStore: (storeId: string) => void;
  onBackToHome?: () => void;
}

export const StoreOwnerDashboard: React.FC<StoreOwnerDashboardProps> = ({
  user,
  initialStore,
  subscription,
  onLogout,
  onPreviewStore,
  onBackToHome,
}) => {
  const { t, isArabic, toggleLanguage } = useLanguage();

  const [store, setStore] = useState<Store | null>(initialStore);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentTab, setCurrentTab] = useState<TabType>('general');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  const loadData = async () => {
    if (!store?.id) return;
    try {
      setIsLoading(true);
      const [fetchedProducts, fetchedStore] = await Promise.all([
        api.getProducts(store.id),
        api.getStore(store.id),
      ]);
      setProducts(fetchedProducts);
      if (fetchedStore) {
        setStore(fetchedStore);
      }
    } catch (err) {
      console.error('Failed loading dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [store?.id]);

  // Construct absolute store link
  const storeUrl = `${window.location.origin}${window.location.pathname}?view=storefront&store_id=${store?.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = storeUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* 1. SIDEBAR (Fixed on desktop, drawer on mobile) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        productCount={products.length}
      />

      {/* 2. MAIN LAYOUT WRAPPER (Shifted on desktop to accommodate sidebar) */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isArabic ? 'lg:mr-72' : 'lg:ml-72'}`}>
        
        {/* TOP NAVBAR / HEADER */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-3.5 transition-colors">
          <div className="flex items-center justify-between gap-3">
            
            {/* Left/Start Side: Hamburger (Mobile) + Store Identity */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0084d6] text-white flex items-center justify-center font-black text-base shadow-md shadow-sky-600/25 shrink-0 overflow-hidden">
                  {store?.logo_data ? (
                    <img src={store.logo_data} alt={store.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{store?.name?.charAt(0) || 'م'}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm sm:text-base font-black text-[#0e1f38] dark:text-white leading-tight truncate max-w-[140px] sm:max-w-[240px]">
                      {store?.name || (isArabic ? 'لوحة تحكم التاجر' : 'Vendor Dashboard')}
                    </h1>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black text-[#0084d6] dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border border-sky-200/80 dark:border-sky-800 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      D1 Live
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-400 font-medium truncate max-w-[160px] sm:max-w-[260px]">
                    {isArabic ? 'التاجر:' : 'Merchant:'} <span className="font-mono font-bold text-[#0084d6] dark:text-sky-400">{user.username}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Right/End Side: Action Buttons & Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              
              {/* Preview Live Store */}
              <button
                onClick={() => {
                  if (store?.id) onPreviewStore(store.id);
                }}
                className="px-3 sm:px-4 py-2 rounded-2xl bg-[#0084d6] hover:bg-[#0074bd] text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-sky-600/25 active:scale-95 transition-all cursor-pointer"
                title={isArabic ? 'معاينة المتجر المباشر' : 'Preview Store'}
              >
                <span className="hidden sm:inline">{t('preview_store')}</span>
                <span className="sm:hidden">{isArabic ? 'معاينة' : 'Preview'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              {/* Copy Direct Store Link */}
              <button
                onClick={handleCopyLink}
                className={`px-3 sm:px-4 py-2 rounded-2xl font-black text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer ${
                  isCopied
                    ? 'bg-emerald-600 text-white shadow-emerald-500/25'
                    : 'bg-[#0e1f38] hover:bg-[#152a4a] text-white'
                }`}
                title={isArabic ? 'نسخ رابط المتجر' : 'Copy store link'}
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-[#00b4d8]" />}
                <span className="hidden md:inline">{isCopied ? t('link_copied') : t('copy_store_link')}</span>
              </button>

              {/* Home Navigation */}
              {onBackToHome && (
                <button
                  onClick={onBackToHome}
                  className="p-2 sm:px-3 sm:py-2 rounded-2xl bg-[#e6f4fe] dark:bg-sky-950/70 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-[#0084d6] dark:text-sky-300 font-black text-xs flex items-center gap-1.5 border border-sky-200/80 dark:border-sky-800 transition-all cursor-pointer"
                  title={isArabic ? 'العودة للرئيسية' : 'Back to Home'}
                >
                  <Home className="w-4 h-4 text-[#0084d6]" />
                  <span className="hidden md:inline">{isArabic ? 'الرئيسية' : 'Home'}</span>
                </button>
              )}

              {/* Language Toggle */}
              <button
                onClick={toggleLanguage}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1"
              >
                <Globe className="w-3.5 h-3.5 text-[#0084d6]" />
                <span className="hidden sm:inline">{t('lang_switch')}</span>
              </button>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#fff1f2] hover:bg-[#ffe4e6] dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-[#e11d48] dark:text-rose-400 border border-[#fecdd3] dark:border-rose-900/70 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-2xs cursor-pointer shrink-0"
                title={t('logout')}
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4 text-[#e11d48] dark:text-rose-400" />
              </button>
            </div>
          </div>
        </header>

        {/* SUBSCRIPTION PLAN STATUS BAR */}
        <div className="bg-[#e6f4fe] dark:bg-sky-950/60 border-b border-sky-200/80 dark:border-sky-900 px-4 sm:px-6 lg:px-8 py-2 text-xs text-sky-900 dark:text-sky-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#0084d6] shrink-0" />
            <span>
              {t('your_plan')} <strong className="font-extrabold">{subscription?.plan_name || t('annual_plan')}</strong>
            </span>
            <span className="text-slate-400">|</span>
            <span>
              {t('expiry_date')} <strong className="font-mono">{subscription?.end_date || (isArabic ? 'غير محدد' : 'N/A')}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#0084d6] dark:text-sky-400 font-bold">
            <span>{t('whatsapp_for_orders')} {store?.whatsapp_number}</span>
          </div>
        </div>

        {/* INACTIVE STORE WARNING / PREVIEW-ONLY BANNER */}
        {store?.is_active === 0 && (
          <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/20 to-amber-500/15 border-b border-amber-300 dark:border-amber-800 px-4 sm:px-6 lg:px-8 py-3.5 text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
                ⚠️
              </div>
              <div>
                <span className="font-black text-xs sm:text-sm block">
                  {isArabic ? 'متجرك قيد المراجعة وبانتظار التفعيل من قبل الإدارة' : 'Store Pending Activation by Admin'}
                </span>
                <span className="text-[11px] text-amber-850 dark:text-amber-300 font-medium block">
                  {isArabic
                    ? 'تم إنشاء متجرك بنجاح وهو حالياً في وضع «المعاينة فقط». يمكنك تصفح المتجر ومعاينته، ولا يمكن إضافة المنتجات أو استقبال الطلبات لحين قيام الأدمن بالتفعيل.'
                    : 'Your store is created in Preview-Only mode. You can preview the store, while editing and live orders are unlocked once activated by Admin.'}
                </span>
              </div>
            </div>
            <button
              onClick={() => store?.id && onPreviewStore(store.id)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition-all shrink-0 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{isArabic ? 'معاينة المتجر الآن' : 'Preview Store'}</span>
            </button>
          </div>
        )}

        {/* MAIN DYNAMIC CONTENT AREA */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto">
          {currentTab === 'general' && (
            <GeneralInfoView
              store={store}
              onNavigateToProducts={() => setCurrentTab('products')}
              onNavigateToStore={() => onPreviewStore(store?.id || '')}
            />
          )}

          {currentTab === 'products' && (
            <ProductsView
              products={products}
              store={store}
              onRefresh={loadData}
            />
          )}

          {currentTab === 'payments' && (
            <PaymentMethodsView
              onGoToWhatsAppCheckout={() => onPreviewStore(store?.id || '')}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              store={store}
              onRefresh={loadData}
            />
          )}
        </main>
      </div>
    </div>
  );
};
