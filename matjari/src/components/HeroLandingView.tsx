import React, { useState, useEffect, useCallback } from 'react';
import { Store, Product, User } from '../types';
import {
  Menu,
  X,
  Globe,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShoppingBag,
  Home,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Clock,
  Store as StoreIcon,
  LogOut,
  LogIn,
  Users,
  Layers,
  BadgePercent,
  Pause,
  Play,
  ArrowLeft,
  ArrowRight,
  SlidersHorizontal,
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

interface FeatureSlide {
  id: string;
  badge: string;
  title: string;
  description: string;
  detailTag: string;
  image: string;
  imageAlt: string;
  Icon: typeof Clock;
  accentBg: string;
  accentText: string;
}

const SLIDE_INTERVAL_MS = 4600;

export const HeroLandingView: React.FC<HeroLandingViewProps> = ({
  store,
  currentUser,
  onOpenDashboard,
  onOpenSetup,
  onOpenMerchantLogin,
  onLogout,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isDark } = useTheme();
  const { t, toggleLang, isArabic } = useLanguage();
  const whatsappNumber = '201061532875';
  const displayPhone = '+20 10 61532875';
  const logoSrc = isDark
    ? `${import.meta.env.BASE_URL}logo-dark.png`
    : `${import.meta.env.BASE_URL}logo.png`;

  const whatsappMessage = isArabic
    ? 'مرحبًا دعيدر للحلول البرمجية، أود الاستفسار عن إنشاء متجر إلكتروني (ابتداءً من 350 جنيه شهريًا).'
    : 'Hello Daidar Solutions, I would like to inquire about creating an online store (starting from 350 EGP/month).';
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  const featureSlides: FeatureSlide[] = [
    {
      id: 'always-open',
      badge: isArabic ? 'متاح 24/7 بدون توقف' : 'Always open · 24/7',
      title: isArabic ? 'شغال 24 ساعة / 7 أيام' : 'Open 24 hours / 7 days',
      description: isArabic
        ? 'متجرك مفتوح طوال اليوم، 7 أيام في الأسبوع — منتجاتك متاحة للعملاء في أي وقت ومن أي مكان.'
        : 'Your store stays open all day, 7 days a week — your products are available to customers anytime.',
      detailTag: isArabic ? 'رابط متجرك يعمل على الموبايل والكمبيوتر' : 'Works smoothly on mobile and desktop',
      image: `${import.meta.env.BASE_URL}landing/feature-24-7.jpg`,
      imageAlt: isArabic
        ? 'جهاز كمبيوتر وهاتف ذكي يعرضان واجهة متجر إلكتروني حديث في إضاءة مسائية'
        : 'Modern laptop and smartphone displaying a clean online store interface in evening lighting',
      Icon: Clock,
      accentBg: 'bg-sky-50 dark:bg-sky-950/70',
      accentText: 'text-[#0084d6] dark:text-sky-400',
    },
    {
      id: 'wider-reach',
      badge: isArabic ? 'انتشار أوسع لنشاطك' : 'Wider online reach',
      title: isArabic ? 'الوصول لنسبة عملاء أكبر' : 'Reach more customers',
      description: isArabic
        ? 'وسّع دائرة وصولك واوصل لعملاء محتملين أكثر أونلاين عبر رابط متجرك القابل للمشاركة على جميع منصاتك.'
        : 'Expand your reach and connect with more potential customers online through your shareable store link.',
      detailTag: isArabic ? 'شارك رابطك على واتساب وفيسبوك وإنستجرام' : 'Share easily on WhatsApp, Facebook, and Instagram',
      image: `${import.meta.env.BASE_URL}landing/feature-reach.jpg`,
      imageAlt: isArabic
        ? 'هواتف ذكية وحقائب تسوق وطرود شحن حديثة تعبّر عن الوصول لعملاء أونلاين'
        : 'Modern smartphones, shopping bags, and frosted parcels representing wide online customer reach',
      Icon: Users,
      accentBg: 'bg-emerald-50 dark:bg-emerald-950/60',
      accentText: 'text-emerald-700 dark:text-emerald-400',
    },
    {
      id: 'more-products',
      badge: isArabic ? 'عرض منظم وجذاب' : 'Clear organized catalog',
      title: isArabic ? 'نسبة عرض منتجات أكثر' : 'Showcase more products',
      description: isArabic
        ? 'اعرض عددًا أكبر من منتجاتك بتصنيفات وصور واضحة وزوّد فرص ظهورها للعميل بدل ضياعها في الرسائل.'
        : 'Display more of your products with clear categories and photos to make browsing effortless for customers.',
      detailTag: isArabic ? 'تصنيفات مرتبة وأسعار واضحة وصور جذابة' : 'Structured categories, clear prices, and crisp photos',
      image: `${import.meta.env.BASE_URL}landing/feature-catalog.jpg`,
      imageAlt: isArabic
        ? 'تشكيلة منتجات منظمة تشمل ساعة وسماعات وعطر ومحفظة على منصات عرض بيضاء وزرقاء'
        : 'Curated retail products including a wristwatch, headphones, perfume bottle, and leather cardholder on clean studio plinths',
      Icon: Layers,
      accentBg: 'bg-indigo-50 dark:bg-indigo-950/60',
      accentText: 'text-indigo-700 dark:text-indigo-400',
    },
  ];

  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setPrefersReducedMotion(media.matches);
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);

  const autoPlayActive = !isPaused && !isInteracting && !prefersReducedMotion;

  useEffect(() => {
    if (!autoPlayActive) return;
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % featureSlides.length);
    }, SLIDE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [autoPlayActive, featureSlides.length]);

  const goPrev = useCallback(() => {
    setActiveSlide((prev) => (prev - 1 + featureSlides.length) % featureSlides.length);
  }, [featureSlides.length]);

  const goNext = useCallback(() => {
    setActiveSlide((prev) => (prev + 1) % featureSlides.length);
  }, [featureSlides.length]);

  const PrimaryArrow = isArabic ? ArrowLeft : ArrowRight;

  const handlePrimaryAuthAction = () => {
    if (currentUser) {
      onOpenDashboard();
    } else {
      onOpenSetup();
    }
  };

  return (
    <div
      dir={isArabic ? 'rtl' : 'ltr'}
      className="relative min-h-screen bg-[#f7fafe] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between selection:bg-sky-100 selection:text-sky-900 overflow-x-hidden transition-colors font-cairo"
    >
      {/* Dynamic Ambient Cloud Background */}
      <MotaryCleanBackground />

      {/* 1. TOP NAVBAR */}
      <header className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800 sticky top-0 z-40 px-3 sm:px-6 lg:px-8 py-3 transition-colors shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Start Area: Menu Button + Brand */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              aria-label={isArabic ? 'فتح القائمة الجانبية' : 'Open navigation menu'}
              className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-[#e6f4fe] dark:hover:bg-sky-950/60 border border-slate-200 dark:border-slate-700 text-[#0e1f38] dark:text-white hover:text-[#0084d6] dark:hover:text-sky-400 font-black text-xs sm:text-sm shadow-2xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0084d6]"
            >
              <Menu className="w-5 h-5 text-[#0084d6]" aria-hidden="true" />
              <span className="hidden xs:inline sm:inline">{isArabic ? 'القائمة' : 'Menu'}</span>
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={logoSrc}
                alt={isArabic ? 'دعيدر للحلول البرمجية' : 'Daidar Solutions'}
                className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-xl shadow-xs shrink-0 bg-white dark:bg-[#0b1628] border border-slate-100 dark:border-slate-800 p-0.5"
              />
              <div className="min-w-0">
                <span className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base tracking-tight block truncate">
                  {t('daidar_solutions')}
                </span>
                <span className="text-[10px] sm:text-[11px] text-[#0084d6] dark:text-sky-400 font-bold block -mt-0.5 truncate">
                  {isArabic ? 'متجري · متجرك الإلكتروني' : 'Matjari · Online Stores'}
                </span>
              </div>
            </div>
          </div>

          {/* End Area: Language + Login/Dashboard CTA */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={toggleLang}
              className="px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0084d6]"
            >
              <Globe className="w-3.5 h-3.5 text-[#0084d6]" aria-hidden="true" />
              <span>{t('lang_switch')}</span>
            </button>

            {currentUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={onOpenDashboard}
                  className="px-3 sm:px-4 py-2 rounded-xl sm:rounded-2xl bg-[#0e1f38] dark:bg-sky-950/80 hover:bg-[#152a4a] text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0084d6]"
                >
                  <StoreIcon className="w-3.5 h-3.5 text-[#00b4d8]" aria-hidden="true" />
                  <span className="max-w-[100px] sm:max-w-[140px] truncate">
                    {store?.name || currentUser.username}
                  </span>
                </button>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    aria-label={isArabic ? 'تسجيل الخروج' : 'Sign out'}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                    title={isArabic ? 'تسجيل الخروج' : 'Sign out'}
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenSetup}
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-[#0084d6] hover:bg-[#0074bd] active:scale-95 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-sky-600/20 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0084d6] focus-visible:ring-offset-2"
              >
                <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                <span>{isArabic ? 'تسجيل الدخول / التسجيل' : 'Sign in / Sign up'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. SIDEBAR DRAWER */}
      <div
        dir={isArabic ? 'rtl' : 'ltr'}
        aria-hidden={!isSidebarOpen}
        className={`fixed inset-0 z-50 overflow-hidden font-cairo transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'opacity-100 pointer-events-auto visible' : 'opacity-0 pointer-events-none invisible delay-200'
        }`}
      >
        <div
          className={`fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300 ease-in-out cursor-pointer ${
            isSidebarOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsSidebarOpen(false)}
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex">
          <div
            className={`w-screen max-w-xs sm:max-w-sm bg-white dark:bg-[#0b1329] text-slate-800 dark:text-slate-100 shadow-2xl flex flex-col justify-between overflow-y-auto border-s border-slate-200/80 dark:border-slate-800 transform transition-transform duration-300 ease-in-out ${
              isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={logoSrc}
                  alt={isArabic ? 'دعيدر للحلول البرمجية' : 'Daidar Solutions'}
                  className="w-8 h-8 object-contain rounded-xl bg-white dark:bg-[#0b1628] border border-slate-200/80 dark:border-slate-800 p-0.5 shrink-0"
                />
                <span className="font-extrabold text-[#0e1f38] dark:text-white text-sm sm:text-base truncate">
                  {t('daidar_solutions')}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                aria-label={isArabic ? 'إغلاق القائمة' : 'Close menu'}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-3 sm:p-4 space-y-1 flex-1 overflow-y-auto">
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
                        {currentUser.role === 'super_admin'
                          ? 'Super Admin'
                          : isArabic
                            ? 'مساحة صاحب المتجر'
                            : 'Merchant Workspace'}
                      </span>
                    </div>
                  </div>
                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSidebarOpen(false);
                        onLogout();
                      }}
                      aria-label={isArabic ? 'تسجيل الخروج' : 'Sign out'}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="w-full text-start px-3.5 py-3 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-[#e6f4fe] dark:hover:bg-sky-950/60 hover:text-[#0084d6] dark:hover:text-sky-400 font-bold text-sm flex items-center justify-between transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Home className="w-5 h-5 text-slate-400 group-hover:text-[#0084d6]" aria-hidden="true" />
                  <span>{t('home')}</span>
                </div>
                <span className="text-xs text-slate-300 group-hover:text-[#0084d6]">
                  {isArabic ? '←' : '→'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsSidebarOpen(false);
                  onOpenSetup();
                }}
                className="w-full text-start px-3.5 py-3 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-[#e6f4fe] dark:hover:bg-sky-950/60 hover:text-[#0084d6] dark:hover:text-sky-400 font-bold text-sm flex items-center justify-between transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <LogIn className="w-5 h-5 text-slate-400 group-hover:text-[#0084d6]" aria-hidden="true" />
                  <span>{currentUser ? (isArabic ? 'مساحة متجري' : 'My Store Workspace') : isArabic ? 'تسجيل الدخول أو إنشاء حساب' : 'Sign in or create account'}</span>
                </div>
                <span className="text-xs text-slate-300 group-hover:text-[#0084d6]">
                  {isArabic ? '←' : '→'}
                </span>
              </button>

              <div className="my-2 border-t border-slate-100 dark:border-slate-800/80" />

              <button
                type="button"
                onClick={() => {
                  setIsSidebarOpen(false);
                  if (currentUser) onOpenDashboard();
                  else onOpenMerchantLogin();
                }}
                className="w-full text-start px-3.5 py-3 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-[#e6f4fe] dark:hover:bg-sky-950/60 hover:text-[#0084d6] dark:hover:text-sky-400 font-bold text-sm flex items-center justify-between transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-5 h-5 text-slate-400 group-hover:text-[#0084d6]" aria-hidden="true" />
                  <span>{currentUser ? (isArabic ? 'لوحة تحكم متجري' : 'Store Dashboard') : t('merchant_portal')}</span>
                </div>
                <span className="text-xs text-slate-300 group-hover:text-[#0084d6]">
                  {isArabic ? '←' : '→'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsSidebarOpen(false);
                  onOpenDashboard();
                }}
                className="w-full text-start px-3.5 py-3 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-[#e6f4fe] dark:hover:bg-sky-950/60 hover:text-[#0084d6] dark:hover:text-sky-400 font-bold text-sm flex items-center justify-between transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-slate-400 group-hover:text-[#0084d6]" aria-hidden="true" />
                  <span>{t('admin_portal')}</span>
                </div>
                <span className="text-xs text-slate-300 group-hover:text-[#0084d6]">
                  {isArabic ? '←' : '→'}
                </span>
              </button>

              <div className="my-2 border-t border-slate-100 dark:border-slate-800/80" />

              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-start px-3.5 py-3 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400 font-bold text-sm flex items-center justify-between transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5 text-emerald-500" aria-hidden="true" />
                  <span>{isArabic ? 'استفسار عبر واتساب' : 'WhatsApp Inquiry'}</span>
                </div>
                <span className="text-xs text-slate-300 group-hover:text-emerald-600">↗</span>
              </a>
            </div>

            <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={toggleLang}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-[#e6f4fe] hover:text-[#0084d6] dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-[#0084d6]" aria-hidden="true" />
                <span>{t('lang_switch')}</span>
              </button>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                © {new Date().getFullYear()} دعيدر
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. ADVERTISING HERO SECTION (RTL Right = Offer & CTA, Left = Auto-Rotating Feature Cards) */}
      <main className="relative z-10 w-full flex-1 pb-24 sm:pb-16">
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10 sm:pt-12 sm:pb-14 lg:pt-16 lg:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-10 lg:gap-12">
            {/* Offer Column (Start side: Right in RTL, Left in LTR) */}
            <div className="lg:col-span-6 text-start space-y-6 landing-card-enter">
              {/* Offer Badge */}
              <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-sky-200/80 bg-white/90 dark:border-sky-800/70 dark:bg-slate-900/90 px-3.5 py-1.5 shadow-2xs">
                <span className="inline-flex h-2 w-2 rounded-full bg-[#0084d6]" aria-hidden="true" />
                <span className="text-xs sm:text-sm font-extrabold text-[#0084d6] dark:text-sky-400">
                  {isArabic ? 'متجرك الإلكتروني من دعيدر · ابدأ أونلاين بسهولة' : 'Daidar Online Store · Launch with confidence'}
                </span>
              </div>

              {/* Primary Advertising Headline */}
              <div className="space-y-2.5">
                <h1 className="text-3xl sm:text-4xl lg:text-[3.1rem] font-black text-[#0e1f38] dark:text-white tracking-tight leading-[1.22]">
                  {isArabic ? (
                    <>
                      امتلك متجرك الإلكتروني{' '}
                      <span className="block mt-1 bg-gradient-to-l from-[#0084d6] via-[#0275be] to-[#0e4a86] dark:from-sky-400 dark:to-cyan-300 bg-clip-text text-transparent">
                        ابتداءً من 350 جنيه شهريًا
                      </span>
                    </>
                  ) : (
                    <>
                      Own your online store{' '}
                      <span className="block mt-1 bg-gradient-to-r from-[#0084d6] via-[#0275be] to-[#0e4a86] dark:from-sky-400 dark:to-cyan-300 bg-clip-text text-transparent">
                        starting from 350 EGP/month
                      </span>
                    </>
                  )}
                </h1>
              </div>

              {/* Short Clear Description */}
              <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-xl">
                {isArabic
                  ? 'اعرض منتجاتك بصور وأسعار وتصنيفات واضحة، واستقبل طلبات عملائك مباشرة على متجرك وتابعها من لوحة التحكم — بتكلفة شهرية أقل من إيجار متجر حقيقي.'
                  : 'Present your products with clear photos, prices, and categories, and receive customer orders directly on your store dashboard — at a lower cost than renting a physical shop.'}
              </p>

              {/* Prominent Primary CTA (Login / Sign up) + Secondary Inquiry */}
              <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={handlePrimaryAuthAction}
                  className="landing-cta-shine min-h-[52px] w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-[#0084d6] hover:bg-[#0074bd] active:scale-[0.98] text-white font-black text-sm sm:text-base shadow-xl shadow-sky-600/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:focus-visible:ring-sky-700"
                >
                  <LogIn className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span>
                    {currentUser
                      ? isArabic
                        ? 'الانتقال إلى مساحة متجري'
                        : 'Open my store workspace'
                      : isArabic
                        ? 'تسجيل الدخول أو إنشاء حساب'
                        : 'Sign in or create account'}
                  </span>
                  <PrimaryArrow className="w-4 h-4 shrink-0" aria-hidden="true" />
                </button>

                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[52px] w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-[#0e1f38] dark:text-white border border-slate-200 dark:border-slate-700 hover:border-emerald-300 font-extrabold text-sm sm:text-base shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
                >
                  <MessageCircle className="w-5 h-5 text-[#25d366] shrink-0" aria-hidden="true" />
                  <span>{isArabic ? 'تواصل عبر واتساب' : 'Ask on WhatsApp'}</span>
                </a>
              </div>

              {/* Honest Pricing Scope Clarity Note */}
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-6 max-w-xl">
                {isArabic
                  ? '350 جنيه شهريًا هو السعر الابتدائي للباقة الأساسية؛ الإضافات الاختيارية أو الدومين الخاص تُحدد حسب اختيارك.'
                  : '350 EGP/month is the starting monthly price for the Basic plan; optional add-ons or a custom domain are selected separately.'}
              </p>

              {/* Key Real Store Highlights */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                {[
                  {
                    icon: CheckCircle2,
                    label: isArabic ? 'بدون عمولات على الطلبات' : 'Zero order commissions',
                  },
                  {
                    icon: CheckCircle2,
                    label: isArabic ? 'استقبال الطلبات مباشرة على المتجر' : 'Direct orders on your store',
                  },
                  {
                    icon: CheckCircle2,
                    label: isArabic ? 'إدارة سهلة للمنتجات والأسعار' : 'Easy product & price control',
                  },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 px-3 py-2.5"
                  >
                    <Icon className="w-4 h-4 text-[#0084d6] shrink-0" aria-hidden="true" />
                    <span className="leading-snug">{label}</span>
                  </div>
                ))}
              </div>

              {/* Direct Support Number */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>{isArabic ? 'للاستفسار المباشر:' : 'Direct inquiry:'}</span>
                <a
                  href={`tel:${whatsappNumber}`}
                  dir="ltr"
                  className="font-bold text-[#0e1f38] dark:text-white font-mono hover:text-[#0084d6] dark:hover:text-sky-400 transition-colors"
                >
                  {displayPhone}
                </a>
              </div>
            </div>

            {/* Rotating Feature Cards Column (End side: Left in RTL, Right in LTR) */}
            <div className="lg:col-span-6 w-full flex justify-center lg:justify-end">
              <div
                aria-roledescription="carousel"
                aria-label={isArabic ? 'مميزات المتجر الإلكتروني' : 'Online store features'}
                onMouseEnter={() => setIsInteracting(true)}
                onMouseLeave={() => setIsInteracting(false)}
                onFocusCapture={() => setIsInteracting(true)}
                onBlurCapture={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setIsInteracting(false);
                  }
                }}
                className="w-full max-w-xl rounded-[2rem] border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 p-4 sm:p-5 shadow-2xl shadow-sky-900/10 backdrop-blur-md"
              >
                {/* Top Carousel Bar: Section Label + Controls */}
                <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#e6f4fe] dark:bg-sky-950 text-[#0084d6] dark:text-sky-400 shrink-0">
                      <Sparkles className="w-4 h-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <span className="block text-xs font-black text-[#0e1f38] dark:text-white truncate">
                        {isArabic ? 'ليه تمتلك متجرك الإلكتروني الآن؟' : 'Why launch your online store now?'}
                      </span>
                      <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400" dir="ltr">
                        0{activeSlide + 1} / 0{featureSlides.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsPaused((v) => !v)}
                      aria-label={
                        isPaused
                          ? isArabic
                            ? 'تشغيل التبديل التلقائي'
                            : 'Resume auto-rotation'
                          : isArabic
                            ? 'إيقاف التبديل التلقائي'
                            : 'Pause auto-rotation'
                      }
                      title={isPaused ? (isArabic ? 'تشغيل' : 'Play') : isArabic ? 'إيقاف مؤقت' : 'Pause'}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-[#0084d6] hover:text-[#0084d6] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0084d6]"
                    >
                      {isPaused ? <Play className="w-3.5 h-3.5" aria-hidden="true" /> : <Pause className="w-3.5 h-3.5" aria-hidden="true" />}
                    </button>
                    <button
                      type="button"
                      onClick={goPrev}
                      aria-label={isArabic ? 'الميزة السابقة' : 'Previous feature'}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-[#0084d6] hover:text-[#0084d6] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0084d6]"
                    >
                      {isArabic ? <ChevronRight className="w-4 h-4" aria-hidden="true" /> : <ChevronLeft className="w-4 h-4" aria-hidden="true" />}
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      aria-label={isArabic ? 'الميزة التالية' : 'Next feature'}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-[#0084d6] hover:text-[#0084d6] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0084d6]"
                    >
                      {isArabic ? <ChevronLeft className="w-4 h-4" aria-hidden="true" /> : <ChevronRight className="w-4 h-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                {/* Fixed-Height Animated Card Stage (Zero Layout Shift) */}
                <div className="mt-4 grid grid-cols-1 grid-rows-1 relative overflow-hidden rounded-2xl">
                  {featureSlides.map((slide, idx) => {
                    const isCurrent = idx === activeSlide;
                    const SlideIcon = slide.Icon;
                    return (
                      <article
                        key={slide.id}
                        aria-hidden={!isCurrent}
                        className={`col-start-1 row-start-1 flex flex-col justify-between rounded-2xl border border-slate-100 dark:border-slate-800 bg-[#f7fafe] dark:bg-slate-950/60 overflow-hidden transition-all duration-500 ease-out motion-reduce:transition-opacity ${
                          isCurrent
                            ? 'opacity-100 translate-y-0 scale-100 z-10'
                            : 'opacity-0 translate-y-3 scale-[0.98] pointer-events-none z-0'
                        }`}
                      >
                        {/* Studio Visual (16:10 fixed aspect ratio, zero people) */}
                        <div className="relative w-full aspect-[16/10] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <img
                            src={slide.image}
                            alt={slide.imageAlt}
                            width={960}
                            height={600}
                            loading={idx === 0 ? 'eager' : 'lazy'}
                            decoding="async"
                            className={`w-full h-full object-cover transition-transform duration-700 ease-out motion-reduce:transition-none ${
                              isCurrent ? 'scale-100' : 'scale-105'
                            }`}
                          />
                          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0e1f38]/55 via-[#0e1f38]/15 to-transparent pointer-events-none" />
                          <span
                            className={`absolute top-3 ${isArabic ? 'right-3' : 'left-3'} inline-flex items-center gap-1.5 rounded-full bg-white/95 dark:bg-slate-900/95 px-3 py-1.5 text-[11px] font-black text-[#0e1f38] dark:text-white shadow-md backdrop-blur-md`}
                          >
                            <SlideIcon className="w-3.5 h-3.5 text-[#0084d6]" aria-hidden="true" />
                            <span>{slide.badge}</span>
                          </span>
                        </div>

                        {/* Feature Text Content (fixed min-height prevents CLS across slides) */}
                        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between min-h-[158px] sm:min-h-[150px]">
                          <div>
                            <div className="flex items-center gap-2.5">
                              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${slide.accentBg} ${slide.accentText}`}>
                                <SlideIcon className="w-5 h-5" aria-hidden="true" />
                              </span>
                              <h2 className="text-lg sm:text-xl font-black text-[#0e1f38] dark:text-white leading-snug">
                                {slide.title}
                              </h2>
                            </div>
                            <p className="mt-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                              {slide.description}
                            </p>
                          </div>

                          <div className="mt-3.5 pt-3 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px] font-bold text-[#0084d6] dark:text-sky-400">
                            <span className="truncate">{slide.detailTag}</span>
                            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Progress & Slide Selector Pills */}
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1" role="tablist" aria-label={isArabic ? 'اختيار الميزة' : 'Choose feature slide'}>
                    {featureSlides.map((slide, idx) => {
                      const isCurrent = idx === activeSlide;
                      return (
                        <button
                          key={slide.id}
                          type="button"
                          role="tab"
                          aria-selected={isCurrent}
                          aria-label={slide.title}
                          onClick={() => setActiveSlide(idx)}
                          className={`relative h-2 rounded-full overflow-hidden transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0084d6] ${
                            isCurrent
                              ? 'flex-1 bg-sky-100 dark:bg-slate-800'
                              : 'w-8 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
                          }`}
                        >
                          {isCurrent && (
                            <span
                              key={`${slide.id}-${activeSlide}-${autoPlayActive ? 'run' : 'stop'}`}
                              className={`block h-full rounded-full bg-[#0084d6] ${
                                autoPlayActive ? 'landing-progress-bar' : 'w-full'
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                    {featureSlides[activeSlide].title}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. CORE ADVANTAGES GRID (Honest, practical value including lower cost than physical rent) */}
        <section
          aria-label={isArabic ? 'مزايا متجرك الإلكتروني' : 'Online store advantages'}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                Icon: BadgePercent,
                title: isArabic ? 'بتكلفة أقل من إيجار متجر حقيقي' : 'Lower cost than a physical shop',
                detail: isArabic
                  ? 'ابدأ متجرك الإلكتروني ابتداءً من 350 جنيه شهريًا بدل تكاليف الإيجار والتجهيز التقليدية.'
                  : 'Start your online store from 350 EGP/month without physical store rent and setup overhead.',
              },
              {
                Icon: Clock,
                title: isArabic ? 'شغال 24 ساعة / 7 أيام' : 'Open 24/7',
                detail: isArabic
                  ? 'عملاؤك يتصفحون المنتجات ويختارون طلباتهم في أي وقت من الموبايل دون تثبيت تطبيق.'
                  : 'Customers browse products and place requests anytime from mobile without installing an app.',
              },
              {
                Icon: ShoppingBag,
                title: isArabic ? 'طلبات مباشرة على المتجر' : 'Direct orders on your store',
                detail: isArabic
                  ? 'العميل يختار منتجاته ويسجّل طلبه مباشرة على متجرك، وتظهر لك كل تفاصيل الطلب وحالته في لوحة التحكم بدون عمولات على المبيعات.'
                  : 'Customers select their products and place orders directly on your store, with full order details and status tracking in your dashboard and zero sales commission.',
              },
              {
                Icon: SlidersHorizontal,
                title: isArabic ? 'إدارة مرنة لمتجرك' : 'Flexible store management',
                detail: isArabic
                  ? 'أضف المنتجات وعدّل الصور والأسعار وتابع الطلبات المسجلة بسهولة من لوحة تحكمك.'
                  : 'Add products, update photos and prices, and follow recorded orders easily from your dashboard.',
              },
            ].map(({ Icon, title, detail }) => (
              <article
                key={title}
                className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-md transition-all"
              >
                <span className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-sky-50 text-[#0084d6] dark:bg-sky-950/70 dark:text-sky-400">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <h3 className="text-base font-black text-[#0e1f38] dark:text-white">{title}</h3>
                <p className="mt-2 text-xs sm:text-sm leading-7 text-slate-600 dark:text-slate-400 font-medium">
                  {detail}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* 5. HOW IT WORKS IN 3 CLEAR STEPS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 text-center space-y-8">
          <div className="space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-black text-[#0084d6] dark:text-sky-400 tracking-wider">
              {isArabic ? 'خطوات واضحة للبدء' : 'Clear steps to start'}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#0e1f38] dark:text-white">
              {isArabic ? 'كيف تبدأ متجرك الإلكتروني؟' : 'How do you start your online store?'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
              {isArabic
                ? 'خطوات بسيطة من غير تعقيد تقني — جهّز متجرك وابدأ استقبال طلباتك.'
                : 'Simple steps with no technical complexity — set up your store and start receiving orders.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                num: isArabic ? '١' : '1',
                bg: 'bg-[#0084d6]',
                title: isArabic ? 'سجّل دخولك أو أنشئ حسابك' : 'Sign in or create an account',
                desc: isArabic
                  ? 'ابدأ بحساب دعيدر الموحد وأضف بيانات متجرك الأساسية في خطوات بسيطة.'
                  : 'Start with your unified Daidar account and enter your basic store details.',
              },
              {
                num: isArabic ? '٢' : '2',
                bg: 'bg-[#0e1f38] dark:bg-slate-800',
                title: isArabic ? 'جهّز منتجاتك واختر باقتك' : 'Add products & choose your plan',
                desc: isArabic
                  ? 'أضف صور منتجاتك وأسعارها وتصنيفاتها، واختر الباقة المناسبة لنشاطك ابتداءً من 350 جنيه شهريًا.'
                  : 'Add product photos, prices, and categories, and select the plan that fits your business starting from 350 EGP/month.',
              },
              {
                num: isArabic ? '٣' : '3',
                bg: 'bg-[#25d366]',
                title: isArabic ? 'شارك رابطك واستقبل الطلبات' : 'Share your link & receive orders',
                desc: isArabic
                  ? 'بعد تفعيل المتجر، شارك رابطك الخاص مع عملائك واستقبل طلباتهم مباشرة على متجرك وتابع حالتها بسهولة.'
                  : 'Once activated, share your store link with customers, receive their orders directly on your store, and track every order status easily.',
              },
            ].map((step) => (
              <article
                key={step.num}
                className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-lg transition-all space-y-3 text-start"
              >
                <div className={`w-11 h-11 rounded-2xl ${step.bg} text-white flex items-center justify-center font-black text-lg shadow-md`}>
                  {step.num}
                </div>
                <h3 className="text-lg font-black text-[#0e1f38] dark:text-white">{step.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                  {step.desc}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* 6. BOTTOM CONVERSION CTA BANNER */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <div className="p-7 sm:p-11 rounded-[2rem] bg-gradient-to-l from-[#0084d6] via-[#0264a8] to-[#0e1f38] text-white shadow-2xl shadow-sky-900/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute -end-12 -top-12 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" aria-hidden="true" />
            <div className="space-y-2.5 text-start z-10 max-w-xl">
              <span className="px-3 py-1 rounded-full bg-white/15 text-white font-extrabold text-xs inline-flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isArabic ? 'ابتداءً من 350 جنيه شهريًا · بدون عمولات' : 'Starting from 350 EGP/month · Zero commissions'}</span>
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight">
                {isArabic ? 'جاهز تطلق متجرك الإلكتروني اليوم؟' : 'Ready to launch your online store today?'}
              </h2>
              <p className="text-sky-100 text-xs sm:text-sm font-medium leading-relaxed">
                {isArabic
                  ? 'سجّل دخولك أو أنشئ حسابك الآن لتجهيز متجرك، أو تواصل معنا مباشرة عبر واتساب لأي استفسار.'
                  : 'Sign in or create your account now to set up your store, or message us on WhatsApp with any questions.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto z-10 shrink-0">
              <button
                type="button"
                onClick={handlePrimaryAuthAction}
                className="min-h-[52px] w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white text-[#0074bd] hover:bg-sky-50 active:scale-[0.98] font-black text-sm sm:text-base shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
              >
                <LogIn className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {currentUser
                    ? isArabic
                      ? 'الانتقال إلى مساحة متجري'
                      : 'Open my store workspace'
                    : isArabic
                      ? 'تسجيل الدخول أو إنشاء حساب'
                      : 'Sign in or create account'}
                </span>
              </button>

              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[52px] w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-[0.98] text-white font-black text-sm sm:text-base border border-white/25 transition-all cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
              >
                <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{isArabic ? 'استفسر على واتساب' : 'WhatsApp Inquiry'}</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* 7. FIXED FLOATING WHATSAPP BUTTON — ALWAYS BOTTOM-RIGHT (Desktop & Mobile with Safe Area) */}
      <div
        dir="ltr"
        className="fixed right-4 sm:right-6 z-50 flex items-center group"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <span
          aria-hidden="true"
          dir={isArabic ? 'rtl' : 'ltr'}
          className="pointer-events-none hidden sm:inline-flex items-center rounded-xl bg-[#0e1f38] px-3.5 py-2 text-xs font-extrabold text-white shadow-lg absolute right-16 opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus-within:opacity-100 group-focus-within:translate-x-0 transition-all duration-200 whitespace-nowrap"
        >
          {isArabic ? 'استفسر عن متجرك عبر واتساب' : 'Ask about your store on WhatsApp'}
        </span>

        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={
            isArabic
              ? 'تواصل معنا عبر واتساب للاستفسار عن إنشاء متجر إلكتروني'
              : 'Contact us on WhatsApp to inquire about creating an online store'
          }
          title={isArabic ? 'استفسر عبر واتساب (+20 10 61532875)' : 'Ask via WhatsApp (+20 10 61532875)'}
          className="w-14 h-14 rounded-full bg-[#25d366] hover:bg-[#1ebe5b] text-white flex items-center justify-center shadow-xl shadow-emerald-600/35 ring-2 ring-white dark:ring-slate-900 hover:scale-105 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
        >
          <svg className="w-7 h-7 fill-white" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
          </svg>
        </a>
      </div>
    </div>
  );
};
