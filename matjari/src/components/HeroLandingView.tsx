import React, { useState, useEffect } from 'react';
import { Store, Product, User } from '../types';
import { 
  Plus, 
  Menu, 
  X, 
  Moon, 
  Sun, 
  Globe, 
  ChevronLeft, 
  ChevronRight, 
  Shield, 
  ShoppingBag, 
  Home, 
  MessageCircle, 
  Sparkles,
  ShoppingCart,
  Star,
  Search,
  CheckCircle2,
  Heart,
  Lock,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Clock,
  Store as StoreIcon,
  LogOut,
  LogIn
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import MotaryCleanBackground from './MotaryCleanBackground';

interface HeroLandingViewProps {
  store: Store | null;
  products: Product[];
  currentUser?: User | null;
  onOpenDashboard: () => void;
  onOpenStorefront: (storeId?: string) => void;
  onOpenSetup: () => void;
  onExploreStores?: () => void;
  onOpenMerchantLogin: () => void;
  onLogout?: () => void;
}

export const HeroLandingView: React.FC<HeroLandingViewProps> = ({
  store,
  products,
  currentUser,
  onOpenDashboard,
  onOpenStorefront,
  onOpenSetup,
  onExploreStores,
  onOpenMerchantLogin,
  onLogout,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const { t, toggleLang, isArabic } = useLanguage();
  const whatsappNumber = '201061532875';
  const displayPhone = '+20 10 61532875';
  const logoSrc = isDark
    ? `${import.meta.env.BASE_URL}logo-dark.png`
    : `${import.meta.env.BASE_URL}logo.png`;

  // Auto-rotating Showcase Slides matching site theme
  const showcaseSlides = [
    {
      storeId: 'store-elegance',
      storeName: isArabic ? 'متجر الأناقة العصري' : 'Modern Elegance Store',
      tagline: isArabic ? 'ساعات فاخرة وأزياء' : 'Luxury Watches & Fashion',
      productName: isArabic ? 'ساعة كرونوغراف جلد كلاسيك' : 'Classic Chronograph Watch',
      price: isArabic ? '٨٥٠ ج.م' : '850 EGP',
      oldPrice: isArabic ? '١,٠٥٠ ج.م' : '1,050 EGP',
      badge: isArabic ? 'الأكثر طلباً 🔥' : 'Best Seller 🔥',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
      rating: '4.9 (124)',
      avatar: '⌚',
      domain: 'elegance.daidar.store',
    },
    {
      storeId: 'store-tech',
      storeName: isArabic ? 'متجر الرياض تك' : 'Riyadh Tech Store',
      tagline: isArabic ? 'أجهزة وإلكترونيات ذكية' : 'Smart Electronics & Tech',
      productName: isArabic ? 'سماعات رأس برو اللاسلكية' : 'Pro Wireless Headphones',
      price: isArabic ? '٥٤٠ ج.م' : '540 EGP',
      oldPrice: isArabic ? '٧٢٠ ج.م' : '720 EGP',
      badge: isArabic ? 'خصم 25% ⚡' : '25% OFF ⚡',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
      rating: '5.0 (98)',
      avatar: '🎧',
      domain: 'tech.daidar.store',
    },
    {
      storeId: 'store-perfume',
      storeName: isArabic ? 'بريق للعطور ومستحضرات التجميل' : 'Bariq Luxury Perfumes',
      tagline: isArabic ? 'عطور شرقية وبخور فاخر' : 'Oriental Perfumes & Oud',
      productName: isArabic ? 'عطر رويال بلاك عود 100ml' : 'Royal Black Oud 100ml',
      price: isArabic ? '٦٢٠ ج.م' : '620 EGP',
      oldPrice: isArabic ? '٨٥٠ ج.م' : '850 EGP',
      badge: isArabic ? 'شحن مجاني 🚚' : 'Free Delivery 🚚',
      image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&q=80',
      rating: '4.9 (142)',
      avatar: '✨',
      domain: 'perfume.daidar.store',
    },
  ];

  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % showcaseSlides.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [showcaseSlides.length]);

  const currentSlide = showcaseSlides[activeSlide];

  // Auto-rotating Live Platform Activities Ticker
  const liveActivities = [
    { text: isArabic ? 'طلب جديد مؤكد في «متجر الأناقة العصري» بقيمة ٨٥٠ ج.م' : 'New confirmed order in "Modern Elegance Store" (850 EGP)', time: isArabic ? 'منذ دقيقة' : '1m ago', icon: '🛍️' },
    { text: isArabic ? 'إنشاء متجر سحابي جديد «عطور الشرق الفاخرة» بنجاح' : 'New cloud store "Orient Perfumes" created successfully', time: isArabic ? 'منذ ٣ دقائق' : '3m ago', icon: '✨' },
    { text: isArabic ? 'استلام طلب مباشر عبر واتساب في «متجر الرياض تك» بقيمة ٥٤٠ ج.م' : 'New direct WhatsApp order in "Riyadh Tech" (540 EGP)', time: isArabic ? 'منذ ٦ دقائق' : '6m ago', icon: '⚡' },
    { text: isArabic ? 'تحديث تلقائي لقواعد بيانات Cloudflare D1 في ٠.٢ ثانية' : 'Auto Cloudflare D1 database sync completed in 0.2s', time: isArabic ? 'منذ ٨ دقائق' : '8m ago', icon: '🚀' },
  ];
  const [activeActivityIndex, setActiveActivityIndex] = useState(0);

  useEffect(() => {
    const actTimer = setInterval(() => {
      setActiveActivityIndex((prev) => (prev + 1) % liveActivities.length);
    }, 3800);
    return () => clearInterval(actTimer);
  }, [liveActivities.length]);

  const currentActivity = liveActivities[activeActivityIndex];

  return (
    <div className="relative min-h-screen bg-[#f7fafe] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between selection:bg-sky-100 selection:text-sky-900 overflow-x-hidden transition-colors font-cairo">
      
      {/* Dynamic Ambient Cloud Background */}
      <MotaryCleanBackground />

      {/* 1. TOP NAVBAR */}
      <header
        dir={isArabic ? 'rtl' : 'ltr'}
        className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-40 px-3 sm:px-6 lg:px-8 py-3 transition-colors shadow-2xs"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          
          {/* Right Area: Menu Button placed strictly at the far right + Logo */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 order-first">
            {/* The Menu Button at the FAR RIGHT */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-[#e6f4fe] dark:hover:bg-sky-950/60 border border-slate-200 dark:border-slate-700 text-[#0e1f38] dark:text-white hover:text-[#0084d6] dark:hover:text-sky-400 font-black text-xs sm:text-sm shadow-2xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 shrink-0"
              title={isArabic ? 'فتح القائمة الجانبية' : 'Open Menu'}
            >
              <Menu className="w-5 h-5 text-[#0084d6]" />
              <span>{isArabic ? 'القائمة' : 'Menu'}</span>
            </button>

            {/* Logo & Platform Info */}
            <div className="flex items-center gap-2.5 cursor-pointer min-w-0" onClick={() => {}}>
              <img
                src={logoSrc}
                alt="دعيدر للحلول البرمجية"
                className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-xl shadow-xs shrink-0 bg-white dark:bg-[#0b1628] border border-slate-100 dark:border-slate-800 p-0.5"
              />
              <div className="min-w-0">
                <span className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-lg tracking-tight block truncate">
                  {t('daidar_solutions')}
                </span>
                <span className="text-[10px] sm:text-[11px] text-[#0084d6] dark:text-sky-400 font-bold block -mt-0.5 sm:-mt-1 truncate">
                  {isArabic ? 'خدمة متجري (Cloudflare D1)' : 'My Store Service (Cloudflare D1)'}
                </span>
              </div>
            </div>
          </div>

          {/* Left Action Area: Language + Create Store CTA */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Language Switcher */}
            <button
              onClick={toggleLang}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5 text-[#0084d6]" />
              <span>{t('lang_switch')}</span>
            </button>

            {/* User State / Create Store CTA */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={onOpenDashboard}
                  className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-[#0e1f38] dark:bg-sky-950/80 hover:bg-[#152a4a] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title={isArabic ? 'الدخول إلى لوحة التحكم' : 'Go to Dashboard'}
                >
                  <StoreIcon className="w-3.5 h-3.5 text-[#00b4d8]" />
                  <span className="max-w-[100px] sm:max-w-[140px] truncate">{store?.name || currentUser.username}</span>
                </button>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title={isArabic ? 'تسجيل الخروج' : 'Logout'}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenSetup}
                className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-[#0084d6] hover:bg-[#0074bd] active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-sky-600/20 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{t('buy_store')}</span>
              </button>
            )}

          </div>

        </div>
      </header>

      {/* 2. MINIMALIST SMOOTH RIGHT-SIDE SIDEBAR DRAWER (بدون مربعات وبدون ردم - ناعمة وبسيطة) */}
      <div
        dir={isArabic ? 'rtl' : 'ltr'}
        className={`fixed inset-0 z-50 overflow-hidden font-cairo transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'opacity-100 pointer-events-auto visible' : 'opacity-0 pointer-events-none invisible delay-200'
        }`}
      >
        {/* Backdrop Fade with Blur */}
        <div
          className={`fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300 ease-in-out cursor-pointer ${
            isSidebarOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsSidebarOpen(false)}
        />

        {/* Drawer Panel - Positioned strictly on the RIGHT with smooth translateX slide */}
        <div className="fixed inset-y-0 right-0 max-w-full flex">
          <div
            className={`w-screen max-w-xs sm:max-w-sm bg-white dark:bg-[#0b1329] text-slate-800 dark:text-slate-100 shadow-2xl flex flex-col justify-between overflow-y-auto border-s border-slate-200/80 dark:border-slate-800 transform transition-transform duration-300 ease-in-out ${
              isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            
            {/* Header: Clean & Simple */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={logoSrc}
                  alt="دعيدر للحلول البرمجية"
                  className="w-8 h-8 object-contain rounded-xl bg-white dark:bg-[#0b1628] border border-slate-200/80 dark:border-slate-800 p-0.5 shrink-0"
                />
                <span className="font-extrabold text-[#0e1f38] dark:text-white text-sm sm:text-base truncate">
                  {t('daidar_solutions')}
                </span>
              </div>

              <button
                onClick={() => setIsSidebarOpen(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                title={isArabic ? 'إغلاق' : 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Menu Items: Clean, Flat List with smooth hover accent */}
            <div className="p-3 sm:p-4 space-y-1 flex-1 overflow-y-auto">
              
              {/* User Account Card in Drawer if Logged In */}
              {currentUser && (
                <div className="p-3 mb-2 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#0084d6] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {currentUser.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="block font-black text-xs text-[#0e1f38] dark:text-white truncate">
                        {store?.name || currentUser.username}
                      </span>
                      <span className="block text-[10px] font-bold text-[#0084d6] dark:text-sky-400">
                        {currentUser.role === 'super_admin' ? 'Super Admin' : (isArabic ? 'متجر نشط' : 'Active Store')}
                      </span>
                    </div>
                  </div>
                  {onLogout && (
                    <button
                      onClick={() => {
                        setIsSidebarOpen(false);
                        onLogout();
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title={isArabic ? 'تسجيل الخروج' : 'Logout'}
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* الرئيسية */}
              <button
                onClick={() => {
                  setIsSidebarOpen(false);
                }}
                className="w-full text-start px-3.5 py-3 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-[#e6f4fe] dark:hover:bg-sky-950/60 hover:text-[#0084d6] dark:hover:text-sky-400 font-bold text-sm flex items-center justify-between transition-colors duration-150 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Home className="w-5 h-5 text-slate-400 group-hover:text-[#0084d6] dark:group-hover:text-sky-400 transition-colors" />
                  <span>{t('home')}</span>
                </div>
                <span className="text-xs text-slate-300 group-hover:text-[#0084d6] dark:group-hover:text-sky-400 transition-colors">
                  {isArabic ? '←' : '→'}
                </span>
              </button>

              {/* إنشاء متجر جديد */}
              <button
                onClick={() => {
                  setIsSidebarOpen(false);
                  onOpenSetup();
                }}
                className="w-full text-start px-3.5 py-3 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-[#e6f4fe] dark:hover:bg-sky-950/60 hover:text-[#0084d6] dark:hover:text-sky-400 font-bold text-sm flex items-center justify-between transition-colors duration-150 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Plus className="w-5 h-5 text-slate-400 group-hover:text-[#0084d6] dark:group-hover:text-sky-400 transition-colors" />
                  <span>{t('buy_store')}</span>
                </div>
                <span className="text-xs text-slate-300 group-hover:text-[#0084d6] dark:group-hover:text-sky-400 transition-colors">
                  {isArabic ? '←' : '→'}
                </span>
              </button>

              <div className="my-2 border-t border-slate-100 dark:border-slate-800/80" />

              {/* دخول أصحاب المتاجر */}
              <button
                onClick={() => {
                  setIsSidebarOpen(false);
                  if (currentUser) {
                    onOpenDashboard();
                  } else {
                    onOpenMerchantLogin();
                  }
                }}
                className="w-full text-start px-3.5 py-3 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-[#e6f4fe] dark:hover:bg-sky-950/60 hover:text-[#0084d6] dark:hover:text-sky-400 font-bold text-sm flex items-center justify-between transition-colors duration-150 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-slate-400 group-hover:text-[#0084d6] dark:group-hover:text-sky-400 transition-colors" />
                  <span>{currentUser ? (isArabic ? 'لوحة تحكم متجري' : 'Store Dashboard') : t('merchant_portal')}</span>
                </div>
                <span className="text-xs text-slate-300 group-hover:text-[#0084d6] dark:group-hover:text-sky-400 transition-colors">
                  {isArabic ? '←' : '→'}
                </span>
              </button>

              {/* لوحة الإدارة (الأدمن) */}
              <button
                onClick={() => {
                  setIsSidebarOpen(false);
                  onOpenDashboard();
                }}
                className="w-full text-start px-3.5 py-3 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-[#e6f4fe] dark:hover:bg-sky-950/60 hover:text-[#0084d6] dark:hover:text-sky-400 font-bold text-sm flex items-center justify-between transition-colors duration-150 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-slate-400 group-hover:text-[#0084d6] dark:group-hover:text-sky-400 transition-colors" />
                  <span>{t('admin_portal')}</span>
                </div>
                <span className="text-xs text-slate-300 group-hover:text-[#0084d6] dark:group-hover:text-sky-400 transition-colors">
                  {isArabic ? '←' : '→'}
                </span>
              </button>

              <div className="my-2 border-t border-slate-100 dark:border-slate-800/80" />

              {/* الدعم الفني عبر واتساب */}
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noreferrer"
                className="w-full text-start px-3.5 py-3 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400 font-bold text-sm flex items-center justify-between transition-colors duration-150 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5 text-emerald-500" />
                  <span>{isArabic ? 'الدعم الفني عبر واتساب' : 'WhatsApp Support'}</span>
                </div>
                <span className="text-xs text-slate-300 group-hover:text-emerald-600 transition-colors">
                  ↗
                </span>
              </a>

            </div>

            {/* Footer: Language, Copyright */}
            <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleLang}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-[#e6f4fe] hover:text-[#0084d6] dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5 text-[#0084d6]" />
                  <span>{t('lang_switch')}</span>
                </button>
              </div>

              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                © {new Date().getFullYear()} دعيدر
              </span>
            </div>

          </div>
        </div>
      </div>

      {/* LIVE REAL-TIME PLATFORM TICKER */}
      <div className="w-full bg-[#f0f7ff]/90 dark:bg-slate-900/90 border-b border-sky-100/70 dark:border-slate-800 py-2 px-4 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
            <span className="font-extrabold text-[#0084d6] dark:text-sky-400 shrink-0">
              {isArabic ? 'نشاط المنصة المباشر:' : 'Live Activity:'}
            </span>
            <span className="text-slate-700 dark:text-slate-200 font-bold truncate transition-all duration-300">
              {currentActivity.icon} {currentActivity.text}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono shrink-0 hidden sm:inline-block">
            {currentActivity.time}
          </span>
        </div>
      </div>

      {/* 2. HERO SECTION */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-14 w-full flex-1 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-14 overflow-hidden">
        
        {/* Ambient Floating Soft Glows */}
        <div className="absolute top-10 end-10 w-96 h-96 bg-sky-400/10 dark:bg-sky-500/5 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse"></div>
        <div className="absolute bottom-10 start-10 w-80 h-80 bg-blue-600/10 dark:bg-blue-600/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
        
        {/* Right Side: Headlines, Text, Buttons */}
        <div className="w-full lg:w-1/2 text-start space-y-6">
          
          {/* Subtitle Badge */}
          <div className="inline-block">
            <span className="text-xs sm:text-sm font-extrabold text-[#0084d6] dark:text-sky-400 tracking-wide">
              {t('hero_subtitle')}
            </span>
          </div>

          {/* Main Headline */}
          <div className="space-y-1">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#0e1f38] dark:text-white tracking-tight leading-tight">
              {t('hero_title_1')}
            </h1>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#0084d6] dark:text-sky-400 tracking-tight leading-tight">
              {t('hero_title_2')} ..
            </h2>
          </div>

          {/* Description */}
          <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-200 font-medium leading-relaxed max-w-xl">
            {t('hero_desc')}
          </p>

          {/* Action Buttons Side-by-Side */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-3.5">
            {/* Primary Blue Button: Create New Store */}
            <button
              onClick={currentUser ? onOpenDashboard : onOpenSetup}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#0084d6] hover:bg-[#0074bd] active:scale-95 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <span>{currentUser ? (isArabic ? '🏪 الانتقال للوحة التحكم' : 'Go to Dashboard') : `+ ${t('create_new_store')}`}</span>
              <span>{isArabic ? '←' : '→'}</span>
            </button>

            {/* Dedicated Merchant Portal Button in Dark Navy */}
            <button
              onClick={currentUser ? onOpenDashboard : onOpenMerchantLogin}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#0e1f38] dark:bg-slate-800 hover:bg-[#152a4a] dark:hover:bg-slate-700 active:scale-95 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-slate-900/15 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5 text-[#00b4d8]" />
              <span>{currentUser ? (isArabic ? 'إدارة متجري' : 'My Store') : `${t('merchant_portal')} ↗`}</span>
            </button>
          </div>

          {/* Three Bullet Points */}
          <div className="pt-3 sm:pt-4 flex flex-wrap items-center gap-2.5 sm:gap-6 text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-200">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0084d6]"></span>
              <span>{t('pro_sites')}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0084d6]"></span>
              <span>{t('fast_d1')}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0084d6]"></span>
              <span>{t('whatsapp_order')}</span>
            </span>
          </div>

          {/* Direct Support Phone */}
          <div className="pt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300 font-medium">
            <span>{t('support_inquiry')}</span>
            <a 
              href={`tel:${whatsappNumber}`}
              className="font-bold text-slate-900 dark:text-white font-mono hover:text-[#0084d6] dark:hover:text-sky-400 dir-ltr transition-colors"
            >
              {displayPhone}
            </a>
          </div>

        </div>

        {/* Left Side: Auto-Rotating Showcase Card (Strictly in site's theme) */}
        <div className="w-full lg:w-1/2 flex justify-center lg:justify-end">
          
          <div 
            onClick={() => onOpenStorefront(currentSlide.storeId)}
            className="w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-sky-500/5 p-4 sm:p-5 space-y-3.5 transition-all duration-300 hover:shadow-sky-500/15 cursor-pointer group select-none"
          >
            
            {/* Top Bar: Store Header & Animated Slide Progress Indicators */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              
              {/* Store Identity */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#f0f7ff] dark:bg-slate-800 border border-sky-100 dark:border-slate-700 flex items-center justify-center text-lg shadow-2xs shrink-0 transition-transform duration-300 group-hover:scale-105">
                  {currentSlide.avatar}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black text-sm sm:text-base text-[#0e1f38] dark:text-white truncate">
                      {currentSlide.storeName}
                    </h3>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[9px] font-black shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      {isArabic ? 'موثّق' : 'Verified'}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-[#0084d6] dark:text-sky-400 font-bold block truncate">
                    {currentSlide.tagline}
                  </span>
                </div>
              </div>

              {/* Animated Slide Progress Bars in site's primary blue */}
              <div className="flex items-center gap-1.5 shrink-0" title={isArabic ? 'المتاجر التفاعلية' : 'Showcase Stores'}>
                {showcaseSlides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSlide(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
                      activeSlide === idx
                        ? 'w-7 bg-[#0084d6]'
                        : 'w-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                  />
                ))}
              </div>

            </div>

            {/* Featured Product Hero Container */}
            <div className="relative rounded-2xl overflow-hidden bg-[#f0f7ff] dark:bg-slate-800/80 p-3 sm:p-4 border border-sky-100/70 dark:border-slate-700/60 transition-all duration-500">
              
              {/* Floating Badges on Product Image */}
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-1 rounded-xl bg-[#0084d6] text-white font-extrabold text-[10px] shadow-xs flex items-center gap-1">
                  <span>{currentSlide.badge}</span>
                </span>
                <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-900 shadow-2xs flex items-center justify-center text-rose-500">
                  <Heart className="w-4 h-4 fill-rose-500" />
                </div>
              </div>

              {/* Product Image with Smooth Transition */}
              <div className="w-full h-44 sm:h-48 rounded-xl overflow-hidden bg-white dark:bg-slate-900/60 flex items-center justify-center shadow-xs">
                <img
                  key={currentSlide.image}
                  src={currentSlide.image}
                  alt={currentSlide.productName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
              </div>

              {/* Product Info */}
              <div className="mt-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                    <div className="flex items-center">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 text-[10px]">({currentSlide.rating})</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                    {isArabic ? 'متوفر فوري' : 'In Stock'}
                  </span>
                </div>

                <h4 className="font-extrabold text-sm sm:text-base text-[#0e1f38] dark:text-white leading-snug">
                  {currentSlide.productName}
                </h4>

                <div className="flex items-baseline gap-2 pt-0.5">
                  <span className="text-lg sm:text-xl font-black text-[#0084d6] dark:text-sky-400">
                    {currentSlide.price}
                  </span>
                  <span className="text-xs text-slate-400 line-through">
                    {currentSlide.oldPrice}
                  </span>
                </div>
              </div>

              {/* WhatsApp Action Button in Site's Brand Blue */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenStorefront(currentSlide.storeId);
                }}
                className="mt-3.5 w-full py-3 px-4 rounded-2xl bg-[#0084d6] hover:bg-[#0074bd] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition-all hover:scale-[1.01] active:scale-98 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>{isArabic ? 'اطلب الآن عبر واتساب بنقرة واحدة' : 'Order Now via WhatsApp (1-Click)'}</span>
              </button>
            </div>

            {/* Bottom Bar: Clean Status Matching Site Tints */}
            <div className="p-2.5 rounded-2xl bg-[#f0f7ff] dark:bg-slate-800/80 border border-sky-100 dark:border-slate-700/80 flex items-center justify-between text-[11px] font-bold text-[#0084d6] dark:text-sky-400 px-3.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-slate-700 dark:text-slate-300 text-[10px]">
                  {isArabic ? 'متجر سحابي مستقل متصل بواتساب' : 'Cloud Store with WhatsApp'}
                </span>
              </div>
              <span className="text-[10px] font-black hover:underline flex items-center gap-1">
                <span>{isArabic ? 'تصفح المتجر' : 'Visit Store'}</span>
                <span>↗</span>
              </span>
            </div>

          </div>

        </div>

      </section>

      {/* 3. LIVE PLATFORM METRICS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-6 w-full">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Metric 1 */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="w-9 h-9 rounded-xl bg-[#f0f7ff] dark:bg-slate-800 text-[#0084d6] dark:text-sky-400 flex items-center justify-center font-black">
                <StoreIcon className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {isArabic ? 'نشط الآن' : 'Live'}
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-[#0e1f38] dark:text-white">
              {isArabic ? '+١٥٠ متجر' : '+150 Stores'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
              {isArabic ? 'متاجر سحابية تعمل على مدار الساعة' : 'Active 24/7 Cloud Stores'}
            </p>
          </div>

          {/* Metric 2 */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                <MessageCircle className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-black text-[#0084d6] dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-md">
                WhatsApp
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-[#0e1f38] dark:text-white">
              {isArabic ? '+١٢,٥٠٠ طلب' : '+12,500 Orders'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
              {isArabic ? 'تم تأكيدها واستلامها عبر واتساب' : 'Confirmed WhatsApp Orders'}
            </p>
          </div>

          {/* Metric 3 */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="w-9 h-9 rounded-xl bg-[#f0f7ff] dark:bg-slate-800 text-[#0084d6] dark:text-sky-400 flex items-center justify-center font-black">
                <Sparkles className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                Cloudflare D1
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-[#0084d6] dark:text-sky-400 font-mono">
              {isArabic ? '٠.٣ ثانية' : '0.3s'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
              {isArabic ? 'سرعة استجابة فائقة لقواعد البيانات' : 'Lightning Database Speed'}
            </p>
          </div>

          {/* Metric 4 */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <span className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                Uptime
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-[#0e1f38] dark:text-white font-mono">
              99.9%
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
              {isArabic ? 'استقرار سحابي وأمان كامل للبيانات' : 'Cloud Reliability & Security'}
            </p>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS IN 3 STEPS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-16 w-full text-center space-y-8">
        <div className="space-y-2 max-w-2xl mx-auto">
          <span className="text-xs font-black text-[#0084d6] dark:text-sky-400 tracking-wider">
            {isArabic ? 'خطوات بسيطة وسريعة' : 'Simple & Fast Steps'}
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-[#0e1f38] dark:text-white">
            {isArabic ? 'كيف تطلق متجرك وتبدأ البيع اليوم؟' : 'How to Launch Your Store Today?'}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
            {isArabic ? 'بدون تعقيدات تقنية أو الحاجة لخبرة برمجية، متجرك جاهز في ٣ دقائق فقط.' : 'No technical complexity or coding required, launch in 3 minutes.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all space-y-3 text-start group">
            <div className="w-12 h-12 rounded-2xl bg-[#0084d6] text-white flex items-center justify-center font-black text-xl shadow-lg shadow-sky-600/25">
              ١
            </div>
            <h3 className="text-lg font-black text-[#0e1f38] dark:text-white group-hover:text-[#0084d6] transition-colors">
              {isArabic ? 'أنشئ متجرك في دقيقة' : 'Create Store in 1 Minute'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              {isArabic ? 'حدد اسم متجرك ونشاطك التجاري، ويتم إنشاء متجرك السحابي المستقل فوراً مع رابط خاص بك.' : 'Enter your store name and category, and get an instant cloud store with a custom link.'}
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all space-y-3 text-start group">
            <div className="w-12 h-12 rounded-2xl bg-[#0e1f38] dark:bg-slate-800 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-slate-900/15">
              ٢
            </div>
            <h3 className="text-lg font-black text-[#0e1f38] dark:text-white group-hover:text-[#0084d6] transition-colors">
              {isArabic ? 'أضف منتجاتك بسهولة' : 'Add Products Easily'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              {isArabic ? 'ارفع صور منتجاتك، وحدد الأسعار والتصنيفات بمرونة كاملة من خلال لوحة تحكم مخصصة لكل تاجر.' : 'Upload photos, set prices and categories with flexible control via merchant portal.'}
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all space-y-3 text-start group">
            <div className="w-12 h-12 rounded-2xl bg-[#25d366] text-white flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-500/25">
              ٣
            </div>
            <h3 className="text-lg font-black text-[#0e1f38] dark:text-white group-hover:text-[#0084d6] transition-colors">
              {isArabic ? 'استقبل الطلبات على واتساب' : 'Receive WhatsApp Orders'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              {isArabic ? 'شارك رابط متجرك مع زبائنك، والزبون يطلب بنقرة زر وتصلك تفاصيل الطلب بالكامل على واتسابك مباشرة.' : 'Share your link; customers order in 1 click and details arrive directly on your WhatsApp.'}
            </p>
          </div>
        </div>
      </section>

      {/* 5. WHY MERCHANTS LOVE US */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 w-full space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-xs font-black text-[#0084d6] dark:text-sky-400 tracking-wider">
            {isArabic ? 'مزايا فريدة لنشاطك' : 'Exclusive Advantages'}
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-[#0e1f38] dark:text-white">
            {isArabic ? 'مميزات تجعل متجرك في الصدارة' : 'Features That Put You Ahead'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-[#0084d6] transition-all space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#25d366] flex items-center justify-center font-black text-lg">
              💬
            </div>
            <h4 className="font-extrabold text-sm sm:text-base text-[#0e1f38] dark:text-white">
              {isArabic ? 'طلب مباشر عبر واتساب' : 'Direct WhatsApp Orders'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              {isArabic ? 'بدون عمولات بنكية أو احتجاز لأموالك، الزبون يتواصل معك ويطلب بضغطة زر واحدة.' : 'No banking commissions or held funds; customers reach you directly.'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-[#0084d6] transition-all space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#f0f7ff] dark:bg-slate-800 text-[#0084d6] dark:text-sky-400 flex items-center justify-center font-black text-lg">
              ⚡
            </div>
            <h4 className="font-extrabold text-sm sm:text-base text-[#0e1f38] dark:text-white">
              {isArabic ? 'أسرع بنية سحابية D1' : 'Fastest Cloudflare D1'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              {isArabic ? 'تقنية سيرفرلس حديثة تعطي متجرك سرعة تحميل فائقة مهما كان عدد الزوار أو المنتجات.' : 'Modern serverless tech gives blazing speed regardless of traffic.'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-[#0084d6] transition-all space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center font-black text-lg">
              🎨
            </div>
            <h4 className="font-extrabold text-sm sm:text-base text-[#0e1f38] dark:text-white">
              {isArabic ? 'تخصيص كامل وتحكم مرن' : 'Full Customization'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              {isArabic ? 'لوحة تحكم سهلة تتيح لك تعديل الأسعار، إضافة المنتجات، وتغيير الشعار في أي لحظة.' : 'Intuitive portal lets you update prices, products and logos in seconds.'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-[#0084d6] transition-all space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-black text-lg">
              📱
            </div>
            <h4 className="font-extrabold text-sm sm:text-base text-[#0e1f38] dark:text-white">
              {isArabic ? 'واجهة موبايل استثنائية' : 'Exceptional Mobile UX'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              {isArabic ? 'تصميم سلس وممتع يشبه التطبيقات الأصلية لشراء أسرع ومعدل تحويل أعلى للزبائن.' : 'Native-like smooth experience for faster checkout and higher conversion.'}
            </p>
          </div>
        </div>
      </section>

      {/* 6. LIVE CTA BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 w-full">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-[#0084d6] via-[#0074bd] to-[#0e1f38] text-white shadow-2xl shadow-sky-600/20 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute -end-10 -top-10 w-60 h-60 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
          <div className="space-y-2 text-start z-10 max-w-xl">
            <span className="px-3 py-1 rounded-full bg-white/15 text-white font-extrabold text-xs inline-block">
              {isArabic ? '🚀 انطلاقة فورية وبدون أي عمولات' : '🚀 Instant Launch with Zero Commissions'}
            </span>
            <h3 className="text-2xl sm:text-4xl font-black leading-tight">
              {isArabic ? 'جاهز تبدأ متجرك وتزيد مبيعاتك اليوم؟' : 'Ready to Launch and Grow Your Sales?'}
            </h3>
            <p className="text-white/80 text-xs sm:text-sm font-medium">
              {isArabic ? 'انضم لمئات التجار الذين يديرون تجارتهم باستقلالية وسرعة فائقة مع استلام فوري للطلبات على واتساب.' : 'Join hundreds of merchants running independent, fast cloud stores with instant WhatsApp orders.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto z-10 shrink-0">
            <button
              onClick={currentUser ? onOpenDashboard : onOpenSetup}
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white text-[#0084d6] hover:bg-sky-50 active:scale-95 font-black text-sm sm:text-base shadow-xl transition-all cursor-pointer"
            >
              {currentUser ? (isArabic ? '🏪 الانتقال للوحة التحكم' : 'Go to Dashboard') : `+ ${t('create_new_store')}`}
            </button>
            <button
              onClick={currentUser ? onOpenDashboard : onOpenMerchantLogin}
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/15 hover:bg-white/20 active:scale-95 text-white font-black text-sm sm:text-base border border-white/20 transition-all cursor-pointer"
            >
              {currentUser ? (isArabic ? 'إدارة المتجر' : 'Manage Store') : `${t('merchant_portal')} ↗`}
            </button>
          </div>
        </div>
      </section>

      {/* 7. FLOATING WHATSAPP BUTTON (Bottom Left Corner) */}
      <div className={`fixed bottom-6 ${isArabic ? 'left-6' : 'right-6'} z-50`}>
        <a
          href={`https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(isArabic ? 'مرحباً دعيدر للحلول البرمجية، أود الاستفسار عن خدمة إنشاء المتاجر الإلكترونية.' : 'Hello Daidar Solutions, I would like to inquire about My Store service.')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-14 h-14 rounded-full bg-[#25d366] hover:bg-[#20bd5a] text-white flex items-center justify-center shadow-xl shadow-emerald-500/30 hover:scale-110 active:scale-95 transition-all"
          title={isArabic ? 'تواصل معنا عبر واتساب (+20 10 61532875)' : 'Contact us via WhatsApp (+20 10 61532875)'}
        >
          <svg className="w-7 h-7 fill-white" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
        </a>
      </div>

    </div>
  );
};
