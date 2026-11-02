import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, ShieldCheck, Phone, ArrowRight, Heart, Share2, Sparkles, Plus, Check, Moon, Sun, Globe } from 'lucide-react';
import { Store, Product, CartItem } from '../types';
import { Footer } from './Footer';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface PublicStorefrontProps {
  store: Store | null;
  products: Product[];
  cart: CartItem[];
  onAddToCart: (product: Product) => void;
  onOpenCart: () => void;
  onBackToDashboard: () => void;
}

export const PublicStorefront: React.FC<PublicStorefrontProps> = ({
  store,
  products,
  cart,
  onAddToCart,
  onOpenCart,
  onBackToDashboard,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { isDark, toggleTheme } = useTheme();
  const { t, toggleLang, isArabic } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>(t('all'));
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addedAnimationId, setAddedAnimationId] = useState<string | null>(null);

  useEffect(() => {
    if (store?.id) {
      api.recordVisit('متصفح واجهة المتجر', store.id);
    }
  }, [store?.id]);

  const currency = store?.currency || (isArabic ? 'ج.م' : '$');
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const phone = store?.whatsapp_number || '201061532875';
  const defaultLogo = isDark
    ? `${import.meta.env.BASE_URL}logo-dark.png`
    : `${import.meta.env.BASE_URL}logo.png`;
  const logoSrc = store?.logo_data || defaultLogo;

  const categories = [t('all'), ...Array.from(new Set(products.map((p) => p.category || (isArabic ? 'عام' : 'General'))))];

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === t('all') || (p.category || (isArabic ? 'عام' : 'General')) === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAdd = (p: Product) => {
    onAddToCart(p);
    setAddedAnimationId(p.id);
    setTimeout(() => setAddedAnimationId(null), 1200);
  };

  return (
    <div className="min-h-screen bg-[#f7fafe] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between font-cairo transition-colors selection:bg-sky-100 selection:text-sky-900">
      
      {/* 1. TOP PREVIEW BANNER & NAVBAR */}
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-30 transition-colors shadow-2xs">
        
        {/* Inactive Store Preview Bar */}
        {store?.is_active === 0 && (
          <div className="bg-amber-500 text-white text-xs py-2 px-3 sm:px-6 font-black text-center flex items-center justify-center gap-2">
            <span>⚠️</span>
            <span>{isArabic ? 'وضع المعاينة: هذا المتجر قيد المراجعة وبانتظار التفعيل من قبل الإدارة' : 'Preview Mode: This store is pending activation by Admin'}</span>
          </div>
        )}

        {/* Merchant preview top notification bar in brand navy */}
        <div className="bg-[#0e1f38] dark:bg-slate-900 text-sky-200 text-xs py-2 px-3 sm:px-6 border-b border-sky-950 dark:border-slate-800">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-bold text-[11px] sm:text-xs truncate max-w-[210px] sm:max-w-none">
              <Sparkles className="w-3.5 h-3.5 text-[#00b4d8] shrink-0" />
              <span className="truncate">{t('live_preview')} • Cloudflare D1</span>
            </span>
            <button
              onClick={onBackToDashboard}
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white hover:text-[#00b4d8] font-black flex items-center gap-1 text-[11px] transition-all shrink-0 whitespace-nowrap cursor-pointer"
              title="العودة ومسح رابط المتجر المؤقت"
            >
              <span>{isArabic ? 'العودة للوحة التحكم / الرئيسية' : 'Back to Dashboard / Home'}</span>
              <ArrowRight className={`w-3.5 h-3.5 ${isArabic ? '' : 'rotate-180'}`} />
            </button>
          </div>
        </div>

        {/* Main Navbar */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Vendor Profile Info */}
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logoSrc}
              alt={store?.name || 'Store Logo'}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl object-contain shadow-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 p-1"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-lg font-black text-[#0e1f38] dark:text-white leading-tight truncate max-w-[150px] xs:max-w-[200px] sm:max-w-xs md:max-w-md">
                  {store?.name || t('daidar_solutions')}
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-black bg-[#e6f4fe] dark:bg-sky-950/70 text-[#0084d6] dark:text-sky-400 px-2.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-800 shrink-0">
                  <ShieldCheck className="w-3 h-3 text-[#0084d6] dark:text-sky-400" />
                  <span>{t('verified')}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate hidden sm:block font-medium">
                {store?.activity_type || t('cloud_store_mgmt')}
              </p>
            </div>
          </div>

          {/* Action Area: Lang + Cart Button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Language Toggle */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-[#0084d6] dark:text-sky-400" />
              <span>{t('lang_switch')}</span>
            </button>

            {/* Cart Button in Brand Blue */}
            <button
              onClick={onOpenCart}
              className="relative inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-[#0084d6] hover:bg-[#0074bd] active:scale-95 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-sky-600/25 transition-all shrink-0 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">{t('shopping_cart')}</span>
              <span className="bg-white text-[#0084d6] font-black text-xs px-2 py-0.5 rounded-full shadow-2xs">
                {totalCartCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO STORE PROFILE */}
      <section className="bg-gradient-to-b from-white to-[#f7fafe] dark:from-slate-900 dark:to-slate-950 border-b border-slate-200/80 dark:border-slate-800 py-8 sm:py-10 px-4 sm:px-6 lg:px-8 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <span className="inline-block text-xs font-black text-[#0084d6] dark:text-sky-400 bg-[#e6f4fe] dark:bg-sky-950/70 px-3.5 py-1 rounded-full border border-sky-200/70 dark:border-sky-800">
              {t('shop_safe')} • {t('whatsapp_order')}
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#0e1f38] dark:text-white tracking-tight">
              {t('welcome_to')} {store?.name || t('platform_name')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-200 leading-relaxed font-medium">
              {store?.bio || (isArabic ? 'تصفح أحدث المنتجات والخدمات الحصرية، واطلب مباشرة عبر تطبيق واتساب بخطوة واحدة سهلة وسريعة.' : 'Browse the latest products and order directly via WhatsApp in one simple step.')}
            </p>
          </div>

          {/* Quick contact pill with phone */}
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-sky-500/5 shrink-0">
            <div className="w-11 h-11 rounded-2xl bg-[#e6f4fe] dark:bg-sky-950/70 text-[#0084d6] dark:text-sky-400 flex items-center justify-center font-bold">
              <Phone className="w-5 h-5" />
            </div>
            <div className="text-start">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-bold">{t('support_inquiry')}</span>
              <a 
                href={`tel:${phone}`}
                className="text-sm font-black text-[#0e1f38] dark:text-white font-mono hover:text-[#0084d6] dark:hover:text-sky-400 dir-ltr block transition-colors"
              >
                +{phone}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 3. MAIN CATALOG SECTION */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
        
        {/* Search & Filters Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Category Filter Pills (Matching Screenshot Style) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-full text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#0084d6] text-white shadow-md shadow-sky-600/25'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px] md:w-80">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isArabic ? 'ابحث عن منتج بالاسم...' : 'Search product by name...'}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-medium focus:border-[#0084d6] focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900 transition-all shadow-2xs"
            />
            <Search className={`w-4 h-4 text-slate-400 absolute ${isArabic ? 'left-3.5' : 'right-3.5'} top-3.5`} />
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center transition-colors shadow-2xl shadow-sky-500/5">
            <ShoppingBag className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">{isArabic ? 'لا توجد منتجات تطابق بحثك' : 'No products match your search'}</h3>
            <p className="text-xs text-slate-400 mt-1">{isArabic ? 'جرب البحث بكلمة أخرى أو اختر تصنيفاً مختلفاً.' : 'Try another search term or filter.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((p) => {
              const isAdded = addedAnimationId === p.id;

              return (
                <div
                  key={p.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-2xl shadow-sky-500/5 hover:shadow-xl transition-all flex flex-col justify-between group"
                >
                  {/* High Quality Product Image from Cloudflare D1 */}
                  <div
                    onClick={() => setSelectedProduct(p)}
                    className="relative aspect-square w-full bg-[#f7fafe] dark:bg-slate-800 cursor-pointer overflow-hidden"
                  >
                    <img
                      src={p.image_data}
                      alt={p.name}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />

                    {p.category && (
                      <span className={`absolute top-3 ${isArabic ? 'right-3' : 'left-3'} text-[10px] font-black bg-[#0e1f38]/80 text-white px-3 py-1 rounded-full backdrop-blur-md`}>
                        {p.category}
                      </span>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3
                        onClick={() => setSelectedProduct(p)}
                        className="font-extrabold text-[#0e1f38] dark:text-white text-sm leading-snug line-clamp-2 hover:text-[#0084d6] dark:hover:text-sky-400 cursor-pointer transition-colors"
                      >
                        {p.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-300 line-clamp-2 mt-1 leading-relaxed font-medium">
                        {p.description || (isArabic ? 'جودة ممتازة وضمان كامل.' : 'High quality and satisfaction guaranteed.')}
                      </p>
                    </div>

                    {/* Price & Add to Cart button */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-3 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-300 block font-bold">{t('price_label')}</span>
                        <span className="text-base sm:text-lg font-black text-[#0084d6] dark:text-sky-400 font-mono">
                          {p.price} <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300">{currency}</span>
                        </span>
                      </div>

                      <button
                        onClick={() => handleAdd(p)}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                          isAdded
                            ? 'bg-[#0e1f38] text-white shadow-md'
                            : 'bg-[#e6f4fe] dark:bg-sky-950/70 text-[#0084d6] dark:text-sky-300 hover:bg-[#0084d6] hover:text-white border border-sky-200 dark:border-sky-800'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>{t('added')}</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>{t('add_to_cart')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs font-cairo">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-fadeIn">
            <div className="relative aspect-4/3 w-full bg-slate-100 dark:bg-slate-800">
              <img
                src={selectedProduct.image_data}
                alt={selectedProduct.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedProduct(null)}
                className={`absolute top-3 ${isArabic ? 'left-3' : 'right-3'} w-8 h-8 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-white font-bold`}
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#0084d6] dark:text-sky-400 bg-[#e6f4fe] dark:bg-sky-950/70 px-3 py-1 rounded-full">
                  {selectedProduct.category || (isArabic ? 'عام' : 'General')}
                </span>
                <span className="text-xl font-black text-[#0084d6] dark:text-sky-400 font-mono">
                  {selectedProduct.price} {currency}
                </span>
              </div>

              <h3 className="text-lg font-black text-[#0e1f38] dark:text-white">{selectedProduct.name}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {selectedProduct.description || (isArabic ? 'منتج مميز بأعلى معايير الجودة.' : 'Premium product made with the highest quality standards.')}
              </p>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <button
                  onClick={() => {
                    handleAdd(selectedProduct);
                    setSelectedProduct(null);
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-[#0084d6] hover:bg-[#0074bd] text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-600/25 active:scale-95 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{t('add_to_cart')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Button for Quick Mobile Access */}
      {totalCartCount > 0 && (
        <div className={`fixed bottom-6 ${isArabic ? 'left-6' : 'right-6'} z-40`}>
          <button
            onClick={onOpenCart}
            className="flex items-center gap-2.5 px-6 py-4 rounded-full bg-[#0084d6] hover:bg-[#0074bd] active:scale-95 text-white font-black text-sm shadow-2xl shadow-sky-600/35 border border-sky-300/40 transition-transform cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>{t('shopping_cart')} ({totalCartCount})</span>
          </button>
        </div>
      )}

      {/* Bottom Footer */}
      <Footer facebookUrl={store?.facebook_url} storeName={store?.name} logoData={logoSrc} />
    </div>
  );
};
