import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Image as ImageIcon, Check, X, Search, Sparkles, AlertCircle, Database } from 'lucide-react';
import { Product, Store } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

interface ProductsViewProps {
  products: Product[];
  store: Store | null;
  onRefresh: () => Promise<void>;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  store,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { t, isArabic } = useLanguage();

  // Form states
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [imageData, setImageData] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const currency = store?.currency || (isArabic ? 'ج.م' : '$');

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setPrice('');
    setCategory(isArabic ? 'عام' : 'General');
    setDescription('');
    setImageData(`data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="%23f0f7ff"/><circle cx="200" cy="180" r="90" fill="%23e0f2fe"/><path d="M150 140 Q200 170 250 140 L270 270 Q200 290 130 270 Z" fill="%230084d6"/><text x="200" y="340" font-family="sans-serif" font-size="20" font-weight="bold" fill="%230e1f38" text-anchor="middle">منتج جديد</text></svg>`);
    setIsAvailable(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setPrice(String(p.price));
    setCategory(p.category || (isArabic ? 'عام' : 'General'));
    setDescription(p.description || '');
    setImageData(p.image_data);
    setIsAvailable(Boolean(p.is_available));
    setFormError('');
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFormError(isArabic ? 'حجم الصورة كبير، يفضل اختيار صورة أقل من 2 ميغابايت للحفاظ على سرعة قاعدة بيانات D1.' : 'Image size is large, please choose image under 2MB for optimal D1 performance.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setImageData(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError(isArabic ? 'يرجى كتابة اسم المنتج' : 'Please enter product name');
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      setFormError(isArabic ? 'يرجى تحديد سعر صالح للمنتج' : 'Please enter valid product price');
      return;
    }
    if (!imageData) {
      setFormError(isArabic ? 'يرجى رفع صورة المنتج أو اختيار صورة افتراضية' : 'Please upload a product image');
      return;
    }

    try {
      setIsSaving(true);
      setFormError('');

      if (editingProduct) {
        await api.updateProduct(editingProduct.id, {
          name: name.trim(),
          price: numPrice,
          category: category.trim() || (isArabic ? 'عام' : 'General'),
          description: description.trim(),
          image_data: imageData,
          is_available: isAvailable ? 1 : 0,
        });
      } else {
        await api.createProduct({
          store_id: store?.id || 'store-default',
          name: name.trim(),
          price: numPrice,
          category: category.trim() || (isArabic ? 'عام' : 'General'),
          description: description.trim(),
          image_data: imageData,
          is_available: isAvailable ? 1 : 0,
        });
      }

      await onRefresh();
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Error saving product in Cloudflare D1');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(isArabic ? 'هل أنت متأكد من حذف هذا المنتج نهائياً من قاعدة بيانات D1؟' : 'Are you sure you want to delete this product from D1?')) {
      try {
        await api.deleteProduct(id);
        await onRefresh();
      } catch (err: any) {
        alert(err.message || 'Error deleting product');
      }
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Top Header Card in Brand Blue & Deep Navy Theme */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#0084d6] dark:text-sky-400 bg-[#e6f4fe] dark:bg-sky-950/60 px-3 py-1 rounded-full w-fit mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cloudflare D1 Product Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {t('products_title')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('products_desc')}
          </p>
        </div>

        <button
          onClick={openAddModal}
          disabled={store?.is_active === 0}
          className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm shadow-md transition-all shrink-0 ${
            store?.is_active === 0
              ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-70'
              : 'bg-[#0084d6] hover:bg-[#0074bd] active:scale-95 text-white shadow-sky-600/20 cursor-pointer'
          }`}
          title={store?.is_active === 0 ? (isArabic ? 'المتجر بانتظار التفعيل من الأدمن' : 'Pending Admin Activation') : t('add_product')}
        >
          <Plus className="w-4 h-4" />
          <span>{t('add_product')}</span>
        </button>
      </div>

      {/* Inactive Notice Banner */}
      {store?.is_active === 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-2.5 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            {isArabic
              ? 'تنبيه: متجرك حالياً غير مفعّل (وضع المعاينة فقط). لا يمكن إضافة أو تعديل المنتجات حتى يقوم الأدمن بتفعيل المتجر.'
              : 'Notice: Your store is currently inactive (Preview-Only). Adding or editing products is locked until activated by Admin.'}
          </span>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-3 shadow-xs flex items-center gap-3 transition-colors">
        <Search className="w-5 h-5 text-slate-400 mr-2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('search_products')}
          className="w-full text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 bg-transparent focus:outline-none"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          >
            {isArabic ? 'مسح' : 'Clear'}
          </button>
        )}
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-8 sm:p-12 text-center transition-colors">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
            <ImageIcon className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">{t('no_products')}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {isArabic ? 'ابدأ بإضافة أول منتج لمتجرك مع تحديد سعره ورفع صورته ليتمكن الزبائن من طلبه عبر واتساب.' : 'Start adding products with images and prices for WhatsApp ordering.'}
          </p>
          <button
            onClick={openAddModal}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0084d6] text-white text-xs font-bold hover:bg-[#0074bd] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('add_first_product')}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              {/* Image Container with D1 Data URI */}
              <div className="relative aspect-4/3 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden border-b border-slate-100 dark:border-slate-800">
                <img
                  src={p.image_data}
                  alt={p.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Status Badge */}
                <div className={`absolute top-3 ${isArabic ? 'right-3' : 'left-3'} flex items-center gap-1.5`}>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs backdrop-blur-md ${
                      p.is_available
                        ? 'bg-[#0084d6]/90 text-white'
                        : 'bg-slate-700/90 text-white'
                    }`}
                  >
                    {p.is_available ? t('available') : t('unavailable')}
                  </span>
                </div>

                <div className={`absolute bottom-3 ${isArabic ? 'right-3' : 'left-3'}`}>
                  <span className="text-[11px] font-medium bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-slate-700 dark:text-slate-200 px-2.5 py-0.5 rounded-lg shadow-xs">
                    {p.category || 'عام'}
                  </span>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug line-clamp-1">
                      {p.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                    {p.description || (isArabic ? 'لا يوجد وصف تفصيلي لهذا المنتج.' : 'No description provided.')}
                  </p>
                </div>

                {/* Price and Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 dark:text-slate-500 block font-medium">{t('price_label')}</span>
                    <span className="text-lg font-black text-[#0084d6] dark:text-sky-400">
                      {p.price} <span className="text-xs font-semibold">{currency}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(p)}
                      className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title={t('edit')}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                      title={t('delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add/Edit Product */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs font-cairo">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fadeIn transition-colors">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  {editingProduct ? (isArabic ? 'تعديل بيانات المنتج' : 'Edit Product') : t('add_product')}
                </h3>
                <span className="text-[11px] text-[#0084d6] dark:text-sky-400 font-medium">
                  Cloudflare D1 Storage
                </span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t('product_name')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isArabic ? 'مثال: موقع تجارة إلكترونية، منتج عطور...' : 'e.g. Modern Silk Shirt, Perfume...'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-[#0084d6] focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900 text-sm font-medium"
                  required
                />
              </div>

              {/* Price & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                    {t('price_label')} ({currency}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-[#0084d6] focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900 text-sm font-bold font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">{t('category')}</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder={isArabic ? 'أزياء، عطور، إلكترونيات...' : 'Fashion, Electronics...'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-[#0084d6] focus:ring-2 focus:ring-sky-100 text-sm font-medium"
                  />
                </div>
              </div>

              {/* High-Quality Image Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t('product_image')} <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                  <div className="w-20 h-20 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden shrink-0">
                    {imageData ? (
                      <img src={imageData} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 w-full">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      id="upload-product-img"
                      className="hidden"
                    />
                    <label
                      htmlFor="upload-product-img"
                      className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition-colors w-full sm:w-auto"
                    >
                      <ImageIcon className="w-4 h-4 text-[#0084d6] dark:text-sky-400" />
                      <span>{t('choose_image')}</span>
                    </label>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      JPG, PNG, WEBP (Base64 in Cloudflare D1).
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">{t('description')}</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={isArabic ? 'وصف ومزايا المنتج...' : 'Product description and specs...'}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:border-[#0084d6] focus:ring-2 focus:ring-sky-100 text-sm font-medium"
                />
              </div>

              {/* Availability Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="product-available"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0084d6] focus:ring-sky-200 border-slate-300"
                />
                <label htmlFor="product-available" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  {t('available')}
                </label>
              </div>

              {/* Form Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-[#0084d6] hover:bg-[#0074bd] text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all flex items-center gap-2 disabled:opacity-70"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{t('save_product')}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
