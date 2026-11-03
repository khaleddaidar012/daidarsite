import React, { useState } from 'react';
import { Store, User, Subscription } from '../types';
import { api } from '../services/api';
import confetti from 'canvas-confetti';
import {
  Lock,
  User as UserIcon,
  Store as StoreIcon,
  ShoppingBag,
  Moon,
  Sun,
  Globe,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Shield,
  Sparkles,
  LogIn,
  UserPlus,
  Phone,
  Tag,
  CheckCircle2,
  Mail
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import MotaryCleanBackground from './MotaryCleanBackground';

interface MerchantLoginViewProps {
  onLoginSuccess: (user: User, store: Store | null, subscription: Subscription | null) => void;
  onBackToHome: () => void;
  initialMode?: 'login' | 'register';
}

export const MerchantLoginView: React.FC<MerchantLoginViewProps> = ({
  onLoginSuccess,
  onBackToHome,
  initialMode = 'login',
}) => {
  const { t, isArabic, toggleLang } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const [linkIdentity,setLinkIdentity]=useState(false);
  const [unified,setUnified]=useState(false);
  React.useEffect(()=>{fetch('/api/ecosystem/config').then(r=>{if(r.ok)setUnified(true)}).catch(()=>{})},[]);

  // Mode: 'login' (عندي حساب) vs 'register' (لسا هعمل حساب جديد)
  const [authMode, setAuthMode] = useState<'login' | 'register'>(initialMode);

  // Login Form State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form State
  const [storeName, setStoreName] = useState('');
  const [activityType, setActivityType] = useState('ملابس وأزياء');
  const [whatsappNumber, setWhatsappNumber] = useState('01061532875');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const logoSrc = isDark
    ? `${import.meta.env.BASE_URL}logo-dark.png`
    : `${import.meta.env.BASE_URL}logo.png`;

  // 1. Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setError(isArabic ? 'يرجى كتابة بريد Google أو اسم المستخدم وكلمة المرور' : 'Please enter your Google Email or username and password');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setSuccessMsg('');
      const res = await api.login(loginUsername.trim(), loginPassword, linkIdentity);
      onLoginSuccess(res.user, res.store, res.subscription);
    } catch (err: any) {
      setError(err.message || (isArabic ? 'بيانات الدخول غير صحيحة، تأكد من بريد Google وكلمة المرور' : 'Invalid login credentials'));
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle Register (New Store & Merchant Account)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !regEmail.trim() || !regPassword.trim() || !whatsappNumber.trim()) {
      setError(isArabic ? 'يرجى ملء جميع الحقول المطلوبة بما في ذلك بريد Google' : 'Please fill all required fields including Google Email');
      return;
    }

    const cleanEmail = regEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError(isArabic ? 'يرجى إدخال بريد إلكتروني حقيقي وصالح من Google (مثال: name@gmail.com)' : 'Please enter a valid Google email address (e.g. name@gmail.com)');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setSuccessMsg('');
      
      const res = await api.registerMerchant({
        store_name: storeName.trim(),
        activity_type: activityType,
        whatsapp_number: whatsappNumber.trim(),
        currency: 'ج.م',
        email: cleanEmail,
        username: regUsername.trim() || cleanEmail.split('@')[0],
        password: regPassword,
      });

      setSuccessMsg(isArabic ? '🎉 تم إنشاء متجرك بنجاح (وضع المعاينة)! جاري نقلك لمعاينة متجرك...' : '🎉 Store created! Redirecting to preview mode...');

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // Confetti fallback
      }

      setTimeout(() => {
        onLoginSuccess(res.user, res.store, res.subscription);
      }, 1200);

    } catch (err: any) {
      setError(err.message || (isArabic ? 'حدث خطأ أثناء إنشاء المتجر' : 'Failed to create store'));
      setIsLoading(false);
    }
  };

  const loginWithDemo = async (user: string, pass: string) => {
    setAuthMode('login');
    setLoginUsername(user);
    setLoginPassword(pass);
    setError('');
    setSuccessMsg(isArabic ? 'جاري تسجيل الدخول...' : 'Signing in...');
    try {
      setIsLoading(true);
      const res = await api.login(user, pass);
      onLoginSuccess(res.user, res.store, res.subscription);
    } catch (err: any) {
      setError(err.message || (isArabic ? 'بيانات الدخول غير صحيحة' : 'Invalid login credentials'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#f7fafe] dark:bg-[#0b1329] text-slate-800 dark:text-slate-100 flex flex-col justify-between font-cairo transition-colors selection:bg-sky-100 selection:text-sky-900 overflow-hidden">
      
      {/* Dynamic Ambient Cloud Background */}
      <MotaryCleanBackground />

      {/* 1. TOP NAVBAR */}
      <header className="relative z-10 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 px-3 sm:px-6 lg:px-8 py-3 transition-colors shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          
          {/* Back to Home & Brand Info */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                localStorage.setItem('has_entered_site', 'true');
                onBackToHome();
              }}
              className="px-3.5 py-1.5 rounded-full bg-[#e6f4fe] dark:bg-sky-950/70 text-[#0084d6] dark:text-sky-400 font-extrabold text-xs flex items-center gap-1.5 hover:bg-sky-100 dark:hover:bg-sky-900/70 transition-colors border border-sky-200/60 dark:border-sky-800/60 cursor-pointer"
              title={isArabic ? 'العودة للصفحة الرئيسية للموقع' : 'Back to Home'}
            >
              {isArabic ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
              <span>{isArabic ? 'الرئيسية' : 'Home'}</span>
            </button>

            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => {
                localStorage.setItem('has_entered_site', 'true');
                onBackToHome();
              }}
            >
              <img
                src={logoSrc}
                alt="دعيدر للحلول البرمجية"
                className="w-9 h-9 object-contain rounded-2xl shadow-xs bg-white dark:bg-[#0b1628] border border-slate-200/80 dark:border-slate-800 p-0.5"
              />
              <div>
                <span className="font-extrabold text-[#0e1f38] dark:text-white text-sm block leading-tight">
                  {t('daidar_solutions')}
                </span>
                <span className="text-[10px] text-[#0084d6] dark:text-sky-400 font-bold block">
                  {isArabic ? 'خدمة متجري • منصة المتاجر السحابية' : 'My Store Service • Cloud Platform'}
                </span>
              </div>
            </div>
          </div>

          {/* Controls: Language */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLang}
              className="px-2.5 sm:px-3 py-2 rounded-2xl text-xs font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-[#0084d6] dark:text-sky-400" />
              <span>{t('lang_switch')}</span>
            </button>
          </div>

        </div>
      </header>

      {/* 2. MAIN CARD */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-sky-500/10 p-6 sm:p-8 space-y-6">
          
          {/* Header Badge & Title */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-[#e6f4fe] dark:bg-sky-950/70 border border-sky-200/80 dark:border-sky-800 flex items-center justify-center text-[#0084d6] dark:text-sky-400 shadow-lg shadow-sky-500/15">
              <StoreIcon className="w-7 h-7" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black bg-[#e6f4fe] dark:bg-sky-950/70 text-[#0084d6] dark:text-sky-400 border border-sky-200 dark:border-sky-800">
              {isArabic ? 'بوابة أصحاب المتاجر الإلكترونية' : 'Store Owners Portal'}
            </span>
            
            <h2 className="text-xl sm:text-2xl font-black text-[#0e1f38] dark:text-white tracking-tight">
              {authMode === 'login'
                ? (isArabic ? 'تسجيل الدخول إلى متجرك' : 'Sign In to Your Store')
                : (isArabic ? 'إنشاء حساب متجر جديد' : 'Create New Store Account')}
            </h2>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
              {authMode === 'login'
                ? (isArabic ? 'أدخل بيانات حسابك لإدارة المنتجات والأسعار واستقبال طلبات الزبائن مباشرة' : 'Enter your credentials to manage products and receive WhatsApp orders')
                : (isArabic ? 'أنشئ متجرك الإلكتروني في ثوانٍ وابدأ في استلام طلبات عملائك فوراً على الواتساب' : 'Create your online store in seconds and receive orders directly via WhatsApp')}
            </p>
          </div>

          {/* TWO PRIMARY BUTTONS REQUESTED BY USER */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80">
            {/* Button 1: تسجيل دخول (للي عنده حساب) */}
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setError('');
                setSuccessMsg('');
              }}
              className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'login'
                  ? 'bg-[#0084d6] text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
              }`}
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>{isArabic ? 'تسجيل دخول' : 'Sign In'}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold hidden sm:inline ${
                authMode === 'login' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>
                {isArabic ? 'عندي حساب' : 'Existing'}
              </span>
            </button>

            {/* Button 2: تسجيل (للي لسا هيعمل حساب) */}
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setError('');
                setSuccessMsg('');
              }}
              className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'register'
                  ? 'bg-[#0084d6] text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
              }`}
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>{isArabic ? 'تسجيل جديد' : 'Register'}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold hidden sm:inline ${
                authMode === 'register' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>
                {isArabic ? 'إنشاء متجر' : 'New Store'}
              </span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 1: FORM FOR "تسجيل دخول" (للي عنده حساب)                  */}
          {/* ───────────────────────────────────────────────────────────── */}
          {authMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4 animate-fadeIn">
              {unified&&<><a href="/api/ecosystem/login" className="block rounded-xl border border-sky-200 bg-sky-50 p-3 text-center text-sm font-bold text-sky-700">{isArabic?'الدخول بحساب دعيدر الموحد':'Daidar account sign-in'}</a><label className="flex items-start gap-2 text-xs leading-6 text-slate-600"><input type="checkbox" checked={linkIdentity} onChange={e=>setLinkIdentity(e.target.checked)}/>{isArabic?'ربط هذا الحساب القديم بهويتي الموحدة الحالية بعد التحقق من كلمة المرور':'Link this existing account to my current Daidar identity after verifying its password'}</label></>}
              <div>
                <label className="block text-xs font-extrabold text-[#0e1f38] dark:text-white mb-1.5">
                  {isArabic ? 'البريد الإلكتروني (Google Gmail) أو اسم المستخدم *' : 'Google Email (Gmail) or Username *'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="yourname@gmail.com"
                    dir="ltr"
                    className="w-full px-4 py-3 ps-10 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:border-[#0084d6] focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/30 transition-all font-mono placeholder:text-slate-400 text-start"
                    required
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute top-3.5 start-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#0e1f38] dark:text-white mb-1.5">
                  {isArabic ? 'كلمة المرور (Password)' : 'Password'}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 ps-10 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:border-[#0084d6] focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/30 transition-all font-mono placeholder:text-slate-400"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute top-3.5 start-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#0084d6] hover:bg-[#0074bd] active:scale-95 text-white font-black text-xs sm:text-sm shadow-lg shadow-sky-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{isArabic ? 'الدخول إلى متجري' : 'Sign In to My Store'}</span>
                    <span>{isArabic ? '←' : '→'}</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ───────────────────────────────────────────────────────────── */}
          {/* TAB 2: FORM FOR "تسجيل" (للي لسا هيعمل حساب جديد)               */}
          {/* ───────────────────────────────────────────────────────────── */}
          {authMode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5 animate-fadeIn">
              
              {/* Store Name */}
              <div>
                <label className="block text-xs font-extrabold text-[#0e1f38] dark:text-white mb-1">
                  {isArabic ? 'اسم المتجر (Store Name) *' : 'Store Name *'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder={isArabic ? 'مثال: متجر السعادة، بوتيك ديانا' : 'e.g. Happy Store'}
                    className="w-full px-4 py-2.5 ps-10 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:border-[#0084d6] focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/30 transition-all placeholder:text-slate-400"
                    required
                  />
                  <StoreIcon className="w-4 h-4 text-slate-400 absolute top-3 start-3.5" />
                </div>
              </div>

              {/* Google Email Input */}
              <div>
                <label className="block text-xs font-extrabold text-[#0e1f38] dark:text-white mb-1">
                  {isArabic ? 'البريد الإلكتروني (حساب Google Gmail) *' : 'Google Email (Gmail) *'}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => {
                      setRegEmail(e.target.value);
                      if (!regUsername) {
                        setRegUsername(e.target.value.split('@')[0]);
                      }
                    }}
                    placeholder="yourname@gmail.com"
                    dir="ltr"
                    className="w-full px-4 py-2.5 ps-9 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:border-[#0084d6] focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/30 transition-all font-mono placeholder:text-slate-400 text-start"
                    required
                  />
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute top-3.5 start-3" />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  {isArabic ? 'يُستخدم بريدك الحقيقي للدخول إلى لوحة التحكم ومتابعة تفعيل متجرك.' : 'Use your real Google email for sign-in and activation.'}
                </p>
              </div>

              {/* Activity Type & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-[#0e1f38] dark:text-white mb-1">
                    {isArabic ? 'نوع النشاط التجاري' : 'Activity Type'}
                  </label>
                  <div className="relative">
                    <select
                      value={activityType}
                      onChange={(e) => setActivityType(e.target.value)}
                      className="w-full px-4 py-2.5 ps-9 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:border-[#0084d6] focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/30 transition-all cursor-pointer"
                    >
                      <option value="ملابس وأزياء">{isArabic ? 'ملابس وأزياء' : 'Fashion & Clothing'}</option>
                      <option value="إلكترونيات وهواتف">{isArabic ? 'إلكترونيات وهواتف' : 'Electronics & Phones'}</option>
                      <option value="عطور ومستحضرات تجميل">{isArabic ? 'عطور وتجميل' : 'Perfumes & Beauty'}</option>
                      <option value="مطاعم ومأكولات">{isArabic ? 'مطاعم ومأكولات' : 'Restaurants & Food'}</option>
                      <option value="سوبر ماركت وبقالة">{isArabic ? 'سوبر ماركت وبقالة' : 'Supermarket & Grocery'}</option>
                      <option value="خدمات أخرى">{isArabic ? 'خدمات عامة أخرى' : 'Other Services'}</option>
                    </select>
                    <Tag className="w-3.5 h-3.5 text-slate-400 absolute top-3.5 start-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#0e1f38] dark:text-white mb-1">
                    {isArabic ? 'رقم الواتساب للطلبات *' : 'WhatsApp Orders No. *'}
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="01061532875"
                      className="w-full px-4 py-2.5 ps-9 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:border-[#0084d6] focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/30 transition-all font-mono placeholder:text-slate-400"
                      required
                    />
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute top-3.5 start-3" />
                  </div>
                </div>
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-[#0e1f38] dark:text-white mb-1">
                    {isArabic ? 'اسم المستخدم للدخول' : 'Username'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder={isArabic ? 'اسم المستخدم' : 'Username'}
                      className="w-full px-4 py-2.5 ps-9 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:border-[#0084d6] focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/30 transition-all font-mono placeholder:text-slate-400"
                    />
                    <UserPlus className="w-3.5 h-3.5 text-slate-400 absolute top-3.5 start-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#0e1f38] dark:text-white mb-1">
                    {isArabic ? 'كلمة المرور *' : 'Password *'}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 ps-9 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:border-[#0084d6] focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/30 transition-all font-mono placeholder:text-slate-400"
                      required
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute top-3.5 start-3" />
                  </div>
                </div>
              </div>

              {/* Submit Registration Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#0084d6] to-[#00b4d8] hover:from-[#0074bd] hover:to-[#0096c7] active:scale-95 text-white font-black text-xs sm:text-sm shadow-lg shadow-sky-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
                    <span>{isArabic ? '🚀 إنشاء المتجر وبدء المعاينة' : '🚀 Create Store & Start Preview'}</span>
                    <span>{isArabic ? '←' : '→'}</span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-center text-amber-600 dark:text-amber-400 font-bold mt-1">
                {isArabic
                  ? 'ℹ️ ملاحظة: يتم إنشاء المتجر بحالة غير مفعلة (معاينة فقط) لحين تفعيله من الأدمن.'
                  : 'ℹ️ Note: Store is created in Preview-only mode until activated by Admin.'}
              </p>

              {/* Free Benefits Callout */}
              <div className="p-2.5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 flex items-center justify-around text-[10px] font-bold text-sky-800 dark:text-sky-300">
                <span>✨ إنشاء فوري</span>
                <span>•</span>
                <span>📱 طلبات على الواتساب</span>
                <span>•</span>
                <span>☁️ سحابة Cloudflare D1</span>
              </div>
            </form>
          )}

          {/* Direct Skip to Main Page (Once passed, never forced to login again) */}
          <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                localStorage.setItem('has_entered_site', 'true');
                onBackToHome();
              }}
              className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-[#0084d6] dark:hover:text-sky-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>{isArabic ? 'تخطي ومتابعة إلى الصفحة الرئيسية' : 'Skip & Continue to Main Page'}</span>
              <span>{isArabic ? '←' : '→'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* 3. FOOTER */}
      <footer className="relative z-10 text-center text-xs text-slate-400 dark:text-slate-500 py-4">
        <span>دعيدر للحلول البرمجية — خدمة متجري • Cloudflare D1 Multi-Tenant</span>
      </footer>

    </div>
  );
};
