import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, MessageSquare, CheckCircle, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import { CartItem, Store } from '../types';
import { api } from '../services/api';
import confetti from 'canvas-confetti';
import { useLanguage } from '../context/LanguageContext';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  store: Store | null;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  store,
}) => {
  const { t, isArabic } = useLanguage();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isOrderConfirmed, setIsOrderConfirmed] = useState(false);

  if (!isOpen) return null;

  const currency = store?.currency || (isArabic ? 'ج.م' : 'EGP');
  const totalPrice = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setError(isArabic ? 'سلة المشتريات فارغة' : 'Your cart is empty');
      return;
    }
    if (!customerName.trim()) {
      setError(isArabic ? 'يرجى كتابة اسم العميل بالكامل' : 'Please enter customer name');
      return;
    }
    if (!customerPhone.trim()) {
      setError(isArabic ? 'يرجى كتابة رقم الهاتف للتواصل' : 'Please enter phone number');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      // 1. Record the order in Cloudflare D1
      await api.recordOrder({
        store_id: store?.id,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_address: customerAddress.trim(),
        notes: notes.trim(),
        items: cart,
        total_price: totalPrice,
      });

      // 2. Format the message for WhatsApp - Clean, ultra-simple, and direct
      const storeName = store?.name || (isArabic ? 'متجري' : 'My Store');
      const itemsList = cart
        .map((item) => `• ${item.product.name} (عدد ${item.quantity})`)
        .join('\n');

      const whatsappMessage = isArabic
        ? `طلب جديد من ${storeName}:\n\n` +
          `${itemsList}\n\n` +
          `الإجمالي: ${totalPrice} ${currency}\n` +
          `الاسم: ${customerName.trim()}\n` +
          `الهاتف: ${customerPhone.trim()}` +
          (customerAddress.trim() ? `\nالعنوان: ${customerAddress.trim()}` : '') +
          (notes.trim() ? `\nملاحظة: ${notes.trim()}` : '')
        : `New order from ${storeName}:\n\n` +
          `${itemsList}\n\n` +
          `Total: ${totalPrice} ${currency}\n` +
          `Name: ${customerName.trim()}\n` +
          `Phone: ${customerPhone.trim()}` +
          (customerAddress.trim() ? `\nAddress: ${customerAddress.trim()}` : '') +
          (notes.trim() ? `\nNote: ${notes.trim()}` : '');

      // 3. Clean store owner's WhatsApp number (+20 10 61532875)
      let phone = store?.whatsapp_number || '201061532875';
      phone = phone.replace(/[^0-9]/g, '');

      // Trigger Confetti Celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      setIsOrderConfirmed(true);

      // 4. Direct Redirect to WhatsApp URL
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(whatsappMessage)}`;
      
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
      }, 500);

    } catch (err: any) {
      setError(err.message || (isArabic ? 'حدث خطأ أثناء حفظ الطلب في D1' : 'Error saving order to D1'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    setIsOrderConfirmed(false);
    onClearCart();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-cairo">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className={`fixed inset-y-0 ${isArabic ? 'left-0 pl-0 sm:pl-10' : 'right-0 pr-0 sm:pr-10'} max-w-full flex`}>
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-2xl flex flex-col justify-between overflow-hidden animate-fadeIn border-x border-slate-200 dark:border-slate-800">
          
          {/* Header in Brand Theme */}
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-[#f0f7ff] dark:bg-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[#0084d6] text-white flex items-center justify-center shadow-xs">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-[#0e1f38] dark:text-white text-base">
                  {t('shopping_cart')}
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {cart.length} {cart.length === 1 ? t('cart_item_singular') : t('cart_items_count')}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
            {isOrderConfirmed ? (
              /* Success / WhatsApp Redirect Screen */
              <div className="py-8 sm:py-10 text-center space-y-4">
                <div className="w-16 h-16 bg-[#e6f4fe] dark:bg-sky-950/70 text-[#0084d6] rounded-full flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-black text-[#0e1f38] dark:text-white">{t('order_success')}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs mx-auto leading-relaxed font-medium">
                  {t('order_success_desc')}
                </p>

                <div className="p-4 rounded-3xl bg-[#f0f7ff] dark:bg-slate-800 border border-sky-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 text-start space-y-1.5 shadow-xs">
                  <div className="font-black text-[#0084d6]">{t('order_summary_label')}</div>
                  <div>• {t('store_label')} {store?.name || (isArabic ? 'دعيدر للحلول البرمجية' : 'Daidar Solutions')}</div>
                  <div>• {t('total_label')} {totalPrice} {currency}</div>
                  <div>• WhatsApp: +{store?.whatsapp_number || '201061532875'}</div>
                </div>

                <div className="pt-4 flex flex-col gap-2.5">
                  <button
                    onClick={() => {
                      let phone = (store?.whatsapp_number || '201061532875').replace(/[^0-9]/g, '');
                      window.open(`https://api.whatsapp.com/send?phone=${phone}`, '_blank');
                    }}
                    className="w-full py-3.5 rounded-2xl bg-[#0084d6] hover:bg-[#0074bd] text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-600/25 transition-all"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{t('whatsapp_btn_label')}</span>
                  </button>

                  <button
                    onClick={handleFinish}
                    className="w-full py-3 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs transition-colors"
                  >
                    {t('back_to_store')}
                  </button>
                </div>
              </div>
            ) : cart.length === 0 ? (
              /* Empty Cart */
              <div className="py-16 text-center space-y-3">
                <div className="w-16 h-16 bg-[#f7fafe] dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('empty_cart')}</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                  {t('empty_cart_desc')}
                </p>
              </div>
            ) : (
              /* Items List & Customer Form */
              <div className="space-y-6">
                {/* Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span>{t('selected_products')}</span>
                    <button
                      onClick={onClearCart}
                      className="text-rose-500 hover:text-rose-600 flex items-center gap-1 font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('clear_cart')}</span>
                    </button>
                  </div>

                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-3 p-3.5 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-2xs"
                    >
                      <img
                        src={item.product.image_data}
                        alt={item.product.name}
                        className="w-14 h-14 rounded-2xl object-cover bg-slate-100 dark:bg-slate-800 shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-[#0e1f38] dark:text-white text-xs sm:text-sm truncate">
                          {item.product.name}
                        </h4>
                        <span className="text-xs font-black text-[#0084d6] block mt-0.5">
                          {item.product.price} {currency}
                        </span>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1 bg-[#f7fafe] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-1">
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, -1)}
                          className="w-6 h-6 rounded-xl bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center justify-center shadow-2xs text-xs font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-slate-800 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, 1)}
                          className="w-6 h-6 rounded-xl bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center justify-center shadow-2xs text-xs font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => onRemoveItem(item.product.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                        title={t('delete')}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Customer Checkout Form */}
                <form id="checkout-form" onSubmit={handleCheckout} className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-extrabold text-[#0e1f38] dark:text-white">
                    {t('checkout_info')}
                  </h4>

                  {error && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-extrabold text-[#0e1f38] dark:text-slate-200 mb-1">
                      {t('customer_name')} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={t('customer_name_placeholder')}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:border-[#0084d6] focus:ring-4 focus:ring-sky-100 text-xs font-medium transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-[#0e1f38] dark:text-slate-200 mb-1">
                      {t('customer_phone')} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder={t('phone_placeholder')}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:border-[#0084d6] focus:ring-4 focus:ring-sky-100 text-xs font-medium font-mono dir-ltr text-start transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-[#0e1f38] dark:text-slate-200 mb-1">
                      {t('customer_address')}
                    </label>
                    <input
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder={t('address_placeholder')}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:border-[#0084d6] focus:ring-4 focus:ring-sky-100 text-xs font-medium transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-[#0e1f38] dark:text-slate-200 mb-1">
                      {t('order_notes')}
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder={t('notes_placeholder')}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:border-[#0084d6] focus:ring-4 focus:ring-sky-100 text-xs font-medium resize-none transition-all"
                    />
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Footer Checkout Action */}
          {!isOrderConfirmed && cart.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-[#f7fafe] dark:bg-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-500 dark:text-slate-300">{t('total_price')}:</span>
                <span className="text-xl font-black text-[#0084d6] dark:text-sky-400">
                  {totalPrice} <span className="text-xs font-bold text-slate-500 dark:text-slate-300">{currency}</span>
                </span>
              </div>

              {/* Order Placement Trigger to WhatsApp in Brand Blue */}
              <button
                type="submit"
                form="checkout-form"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#0084d6] hover:bg-[#0074bd] active:scale-[0.99] text-white font-black text-sm shadow-lg shadow-sky-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 fill-white" />
                    <span>{t('confirm_whatsapp_btn')}</span>
                    {isArabic ? <ArrowLeft className="w-4 h-4 mr-1" /> : <ArrowRight className="w-4 h-4 ml-1" />}
                  </>
                )}
              </button>

              <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 leading-normal">
                🔒 {t('d1_cart_notice')}
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
