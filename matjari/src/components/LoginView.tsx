import React, { useState } from 'react';
import { Store, User, Subscription } from '../types';
import { api } from '../services/api';
import {
  Lock,
  User as UserIcon,
  LogIn,
  AlertCircle,
  Shield,
  Moon,
  Sun,
  Globe,
  ArrowRight,
  ArrowLeft,
  Store as StoreIcon
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import MotaryCleanBackground from './MotaryCleanBackground';

interface LoginViewProps {
  onLoginSuccess: (user: User, store: Store | null, subscription: Subscription | null) => void;
  onBackToHome: () => void;
  onGoToMerchantLogin?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onBackToHome,
  onGoToMerchantLogin,
}) => {
  const { t, isArabic, toggleLang } = useLanguage();
  const { isDark, toggleTheme } = useTheme();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const logoSrc = isDark
    ? `${import.meta.env.BASE_URL}logo-dark.png`
    : `${import.meta.env.BASE_URL}logo.png`;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError(isArabic ? 'يرجى إدخال اسم المستخدم وكلمة المرور' : 'Please enter username and password');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const res = await api.login(username.trim(), password);
      onLoginSuccess(res.user, res.store, res.subscription);
    } catch (err: any) {
      setError(err.message || (isArabic ? 'بيانات تسجيل الدخول غير صحيحة' : 'Invalid login credentials'));
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
          
          {/* Logo & Brand Info */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHome}
              className="px-3.5 py-1.5 rounded-full bg-[#e6f4fe] dark:bg-sky-950/70 text-[#0084d6] dark:text-sky-400 font-extrabold text-xs flex items-center gap-1.5 hover:bg-sky-100 dark:hover:bg-sky-900/70 transition-colors border border-sky-200/60 dark:border-sky-800/60 cursor-pointer"
              title={isArabic ? 'العودة للصفحة الرئيسية' : 'Back to Home'}
            >
              {isArabic ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
              <span>{isArabic ? 'الرئيسية' : 'Home'}</span>
            </button>

            <div className="flex items-center gap-2 cursor-pointer" onClick={onBackToHome}>
              <img
                src={logoSrc}
                alt="دعيدر للحلول البرمجية"
                className="w-9 h-9 object-contain rounded-2xl shadow-xs bg-white dark:bg-[#0b1628] border border-slate-200/80 dark:border-slate-800 p-0.5"
              />
              <div className="hidden sm:block">
                <span className="font-extrabold text-[#0e1f38] dark:text-white text-sm block leading-tight">
                  {t('daidar_solutions')}
                </span>
                <span className="text-[10px] text-[#0084d6] dark:text-sky-400 font-bold block">
                  {isArabic ? 'بوابة الأدمن الرئيسي (Super Admin)' : 'Super Admin Portal'}
                </span>
              </div>
            </div>
          </div>

          {/* Controls: Language */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLang}
              className="px-2.5 sm:px-3 py-2 rounded-2xl text-xs font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 transition-colors flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5 text-[#0084d6] dark:text-sky-400" />
              <span>{t('lang_switch')}</span>
            </button>
          </div>

        </div>
      </header>

      {/* 2. ADMIN LOGIN CARD */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-sky-500/10 p-6 sm:p-8 space-y-6">
          
          {/* Switcher: Merchant Portal vs Admin */}
          {onGoToMerchantLogin && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80">
              <button
                type="button"
                onClick={onGoToMerchantLogin}
                className="py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-[#0084d6] hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
              >
                <StoreIcon className="w-3.5 h-3.5 text-[#0084d6]" />
                <span>{isArabic ? 'بوابة أصحاب المتاجر' : 'Store Owners'}</span>
              </button>
              <div
                className="py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 bg-[#0e1f38] text-white shadow-sm"
              >
                <Shield className="w-3.5 h-3.5 text-[#00b4d8]" />
                <span>{isArabic ? 'الأدمن الرئيسي' : 'Super Admin'}</span>
              </div>
            </div>
          )}

          {/* Card Header with Shield Icon */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-[#0e1f38] dark:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-[#00b4d8] shadow-lg shadow-slate-900/15">
              <Shield className="w-7 h-7" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black bg-[#e6f4fe] dark:bg-sky-950/70 text-[#0084d6] dark:text-sky-400 border border-sky-200 dark:border-sky-800">
              {isArabic ? 'لوحة التحكم المركزية • Cloudflare D1' : 'Central Admin Portal • Cloudflare D1'}
            </span>
            
            <h2 className="text-xl sm:text-2xl font-black text-[#0e1f38] dark:text-white tracking-tight">
              {isArabic ? 'تسجيل دخول الأدمن الرئيسي' : 'Super Admin Sign In'}
            </h2>
            
            <p className="text-xs text-slate-500 dark:text-slate-300 max-w-xs mx-auto font-medium">
              {isArabic
                ? 'خاص بإدارة النظام، تفعيل المتاجر، ومتابعة الاشتراكات السحابية'
                : 'Dedicated to platform management, merchant subscriptions, and system administration'}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-[#0e1f38] dark:text-white mb-1.5">
                {isArabic ? 'اسم المستخدم للأدمن (Admin Username)' : 'Admin Username'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={isArabic ? 'مثال: admin' : 'e.g. admin'}
                  className="w-full px-4 py-3 ps-10 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:border-[#0084d6] focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/30 transition-all font-mono placeholder:text-slate-400"
                  required
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute top-3.5 start-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-[#0e1f38] dark:text-white mb-1.5">
                {isArabic ? 'كلمة المرور (Password)' : 'Password'}
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              className="w-full py-3.5 px-4 rounded-2xl bg-[#0e1f38] hover:bg-[#152a4a] active:scale-95 text-white font-black text-xs sm:text-sm shadow-lg shadow-slate-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Shield className="w-4 h-4 text-[#00b4d8]" />
                  <span>{isArabic ? 'الدخول إلى لوحة إدارة المنصة' : 'Enter Admin Dashboard'}</span>
                  <span>{isArabic ? '←' : '→'}</span>
                </>
              )}
            </button>
          </form>

          {/* Link to Merchant Portal */}
          {onGoToMerchantLogin && (
            <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={onGoToMerchantLogin}
                className="text-xs font-bold text-[#0084d6] dark:text-sky-400 hover:underline transition-colors flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
              >
                <StoreIcon className="w-3.5 h-3.5 text-[#0084d6]" />
                <span>{isArabic ? 'هل أنت صاحب متجر؟ اضغط هنا للدخول لمتجرك' : 'Are you a store owner? Click here to access your store'}</span>
              </button>
            </div>
          )}

        </div>
      </div>

      {/* 3. FOOTER */}
      <footer className="relative z-10 text-center text-xs text-slate-400 dark:text-slate-500 py-4">
        <span>دعيدر للحلول البرمجية — Multi-Tenant Management • Cloudflare D1</span>
      </footer>

    </div>
  );
};
