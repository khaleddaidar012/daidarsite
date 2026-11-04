import React from 'react';
import { CreditCard, ShieldCheck, CheckCircle2, Sparkles, MessageCircle, MessageSquare, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface PaymentMethodsViewProps {
  onGoToWhatsAppCheckout: () => void;
}

export const PaymentMethodsView: React.FC<PaymentMethodsViewProps> = ({ onGoToWhatsAppCheckout }) => {
  const { t, isArabic } = useLanguage();

  const paymentGateways = [
    {
      id: 'apple-pay',
      name: 'Apple Pay',
      category: isArabic ? 'محافظ رقمية ذكية' : 'Smart Digital Wallets',
      description: isArabic ? 'دفع فوري بلمسة واحدة عبر أجهزة iPhone و Mac و Apple Watch بأعلى معايير الأمان.' : 'One-touch instant payment via Apple devices with maximum security.',
      iconText: 'Pay',
      iconBg: 'bg-[#0e1f38] text-white',
    },
    {
      id: 'visa-mastercard',
      name: isArabic ? 'بطاقات فيزا وماستركارد (Visa / Mastercard)' : 'Visa / Mastercard Cards',
      category: isArabic ? 'بطاقات ائتمانية ومباشرة' : 'Credit & Debit Cards',
      description: isArabic ? 'قبول جميع البطاقات البنكية الدولية والمحلية مع معالجة آمنة مشفرة 3D Secure.' : 'Accept international and local cards with encrypted 3D Secure processing.',
      iconText: 'VISA / MC',
      iconBg: 'bg-[#0084d6] text-white',
    },
    {
      id: 'mada',
      name: isArabic ? 'مدى (Mada)' : 'Mada Payment Network',
      category: isArabic ? 'الشبكة السعودية للمدفوعات' : 'Saudi Payment Network',
      description: isArabic ? 'الدفع المباشر لعملاء المملكة العربية السعودية عبر بطاقات مدى البنكية بكل سهولة.' : 'Direct payment for Saudi Arabia clients via Mada debit cards.',
      iconText: 'mada',
      iconBg: 'bg-[#00b4d8] text-white',
    },
    {
      id: 'instapay-vodafone',
      name: isArabic ? 'إنستاباي ومحافظ فودافون كاش' : 'InstaPay & Mobile Wallets',
      category: isArabic ? 'المدفوعات اللحظية المصرية' : 'Instant Egyptian Payments',
      description: isArabic ? 'تحويل لحظي مباشر عبر شبكة إنستاباي القومية ومحافظ الهاتف المحمول (فودافون، أورنج، اتصالات، وي).' : 'Instant transfers via InstaPay and mobile network wallets.',
      iconText: 'InstaPay',
      iconBg: 'bg-[#0e1f38] text-white',
    },
    {
      id: 'fawry',
      name: isArabic ? 'فوري (Fawry)' : 'Fawry Cash Network',
      category: isArabic ? 'شبكات الدفع النقدي والتحصيل' : 'Cash Collection & POS',
      description: isArabic ? 'إصدار كود دفع فوري للعملاء للسداد عبر أكثر من 300,000 نقطة بيع وماكينة فوري.' : 'Instant payment code for customers across 300,000+ Fawry POS machines.',
      iconText: 'FAWRY',
      iconBg: 'bg-amber-500 text-white',
    },
    {
      id: 'tabby-tamara',
      name: isArabic ? 'تابي وتمارا (اشتري الآن وادفع لاحقاً)' : 'Tabby & Tamara (BNPL)',
      category: isArabic ? 'تقسيط المشتريات بدون فوائد' : 'Interest-Free Installments',
      description: isArabic ? 'تمكين الزبائن من تقسيم قيمة مشترياتهم على 3 أو 4 دفعات ميسرة بدون أي فوائد إضافية.' : 'Allow customers to split purchases into 3 or 4 interest-free installments.',
      iconText: 'BNPL',
      iconBg: 'bg-[#0084d6] text-white',
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#0084d6] dark:text-sky-400 bg-[#e6f4fe] dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 px-3 py-1 rounded-full w-fit mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#0084d6] dark:text-sky-400" />
              <span>{isArabic ? 'ميزة مدمجة: بوابات دفع إلكترونية' : 'Integrated Feature: Payment Gateways'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {t('payment_methods')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {isArabic ? 'تم تكامل وإعداد بنية بوابات الدفع الإلكترونية السحابية لتفعيلها للمتاجر.' : 'Cloud payment gateways infrastructure ready for activation.'}
            </p>
          </div>
        </div>
      </div>

      {/* Active Solution Notice: WhatsApp Checkout */}
      <div className="bg-[#0e1f38] dark:bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-slate-900/15 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-[#00b4d8]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#00b4d8]" />
            <span>{isArabic ? 'طريقة الدفع الحالية المفعلة والنشطة' : 'Currently Active Checkout Method'}</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            {isArabic ? 'الدفع وتأكيد الطلب المباشر عبر تطبيق واتساب' : 'Direct Order Confirmation via WhatsApp'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 dark:text-slate-400 max-w-2xl leading-relaxed">
            {isArabic ? 'جميع طلبات زبائن متجرك يتم تجميعها تلقائياً مع العنوان وحساب الإجمالي وإرسالها مباشرة إلى رقم واتساب الخاص بالمتجر للتأكيد والتوصيل الفوري.' : 'All store orders are formatted with address, totals, and sent directly to the store WhatsApp for fast fulfillment.'}
          </p>
        </div>

        <button
          onClick={onGoToWhatsAppCheckout}
          className="shrink-0 px-5 py-3 rounded-2xl bg-[#0084d6] text-white font-bold text-xs sm:text-sm hover:bg-[#0074bd] active:scale-95 transition-all shadow-md flex items-center gap-2"
        >
          <MessageSquare className="w-4 h-4 text-white" />
          <span>{isArabic ? 'معاينة تدفق واتساب الآن' : 'Preview WhatsApp Flow'}</span>
          <ArrowRight className={`w-3.5 h-3.5 ${isArabic ? '' : 'rotate-180'}`} />
        </button>
      </div>

      {/* Gateways Grid with MANDATORY "قريباً" (Coming Soon) LABEL */}
      <div>
        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4 px-1 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#0084d6] dark:text-sky-400" />
          <span>{isArabic ? 'بوابات الدفع المدمجة في المنصة' : 'Integrated Payment Gateways'}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paymentGateways.map((gw) => (
            <div
              key={gw.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between relative overflow-hidden group"
            >
              {/* Mandatory "قريباً" Badge */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className={`px-3 py-1.5 rounded-xl font-black text-xs tracking-wider shadow-xs ${gw.iconBg}`}>
                  {gw.iconText}
                </div>

                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                  <span>{t('coming_soon')}</span>
                </span>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base mb-1">
                  {gw.name}
                </h4>
                <span className="text-[11px] font-medium text-[#0084d6] dark:text-sky-400 bg-[#e6f4fe] dark:bg-sky-950/60 px-2 py-0.5 rounded-md inline-block mb-3">
                  {gw.category}
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {gw.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isArabic ? 'ربط بنكي متكامل' : 'Banking Integration'}
                </span>
                <span className="text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                  {t('coming_soon')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
