import React, { useState, useEffect } from 'react';
import { MerchantDetail } from '../types';
import { api as defaultApi, createStoreApi } from '../services/api';
import EcosystemAdmin from '../../../shared/EcosystemAdmin';
import EcosystemPanel from '../../../shared/EcosystemPanel';
import {
  Store as StoreIcon,
  Plus,
  CheckCircle,
  XCircle,
  Calendar,
  RefreshCw,
  LogOut,
  ExternalLink,
  Shield,
  Search,
  Sparkles,
  AlertCircle,
  Clock,
  Package,
  Moon,
  Sun,
  Globe,
  Copy,
  Check,
  TrendingUp,
  BarChart2,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  X,
  MessageSquare,
  Trash2,
  Compass
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface SuperAdminDashboardProps {
  embedded?: boolean;
  storeBaseUrl?: string;
  apiClient?: ReturnType<typeof createStoreApi>;
  onLogout: () => void;
  onPreviewStore: (storeId: string) => void;
  onExploreStores?: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  onLogout,
  onPreviewStore,
  onExploreStores,
  embedded=false, apiClient,storeBaseUrl,
}) => {
  const api=apiClient||defaultApi;
  const { t, isArabic, toggleLanguage } = useLanguage();
  const { isDark, toggleTheme } = useTheme();

  const [merchants, setMerchants] = useState<MerchantDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'valid' | 'expired' | 'pending'>('all');
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [copiedStoreId, setCopiedStoreId] = useState<string | null>(null);
  const [selectedMerchantForView, setSelectedMerchantForView] = useState<MerchantDetail | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [selectedMerchantForRenew, setSelectedMerchantForRenew] = useState<MerchantDetail | null>(null);
  const [renewMode, setRenewMode] = useState<'add' | 'subtract'>('add');
  const [renewMonths, setRenewMonths] = useState<number>(12);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [platformAnalytics, setPlatformAnalytics] = useState<{
    totalOrders: number;
    totalProducts: number;
    monthMap: Record<string, number>;
  }>({
    totalOrders: 0,
    totalProducts: 0,
    monthMap: {},
  });

  // New Merchant Form State
  const [newStoreName, setNewStoreName] = useState('');
  const [newActivityType, setNewActivityType] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPlanName, setNewPlanName] = useState('الباقة السنوية الاحترافية');
  const [newDuration, setNewDuration] = useState(12);
  const [newPrice, setNewPrice] = useState(1200);

  const logoBase=typeof window==='undefined'?'/':new URL('.',window.location.href).pathname;
  const logoSrc = embedded?'/icon.png':isDark
    ? `${logoBase}logo-dark.png`
    : `${logoBase}logo.png`;

  const loadMerchants = async () => {
    try {
      setIsLoading(true);
      const [data, analytics] = await Promise.all([
        api.getMerchants(),
        api.getAdminAnalytics(),
      ]);
      setMerchants(data);
      setPlatformAnalytics(analytics);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || (isArabic ? 'فشل جلب بيانات المتاجر' : 'Failed to fetch merchants') });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMerchants();
  }, []);

  const handleCopyStoreLink = async (storeId: string) => {
    const url = `${storeBaseUrl||window.location.origin+window.location.pathname}?view=storefront&store_id=${encodeURIComponent(storeId)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedStoreId(storeId);
    setTimeout(() => setCopiedStoreId(null), 2500);
  };

  const handleCreateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim() || !newUsername.trim() || !newPassword.trim() || !newWhatsapp.trim()) {
      setMessage({ type: 'error', text: isArabic ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields' });
      return;
    }

    try {
      setActionLoading(true);
      setMessage(null);
      await api.createMerchant({
        store_name: newStoreName.trim(),
        activity_type: newActivityType.trim() || (isArabic ? 'تجارة عامة' : 'General Commerce'),
        whatsapp_number: newWhatsapp.trim(),
        username: newUsername.trim(),
        password: newPassword.trim(),
        plan_name: newPlanName,
        duration_months: newDuration,
        price: newPrice,
      });

      setMessage({ type: 'success', text: isArabic ? `تم إنشاء حساب متجر «${newStoreName}» بنجاح!` : `Store account "${newStoreName}" created successfully!` });
      setIsCreateModalOpen(false);
      setNewStoreName('');
      setNewActivityType('');
      setNewWhatsapp('');
      setNewUsername('');
      setNewPassword('');
      await loadMerchants();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || (isArabic ? 'حدث خطأ أثناء إنشاء الحساب' : 'Error creating account') });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (merchant: MerchantDetail) => {
    try {
      setActionLoading(true);
      const newState = await api.toggleMerchantStatus(merchant.store.id);
      setMerchants(prev =>
        prev.map(m =>
          m.store.id === merchant.store.id
            ? {
                ...m,
                store: { ...m.store, is_active: newState },
                user: { ...m.user, is_active: newState },
              }
            : m
        )
      );
      setMessage({
        type: 'success',
        text: newState === 1
          ? (isArabic ? `تم تفعيل متجر «${merchant.store.name}» بنجاح.` : `Store "${merchant.store.name}" activated successfully.`)
          : (isArabic ? `تم إيقاف تفعيل متجر «${merchant.store.name}».` : `Store "${merchant.store.name}" deactivated.`),
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || (isArabic ? 'فشل تغيير حالة المتجر' : 'Failed to update store status') });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteStore = async (merchant: MerchantDetail) => {
    const confirmMsg = t('delete_store_confirm');
    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      setActionLoading(true);
      await api.deleteStore(merchant.store.id);
      setMerchants(prev => prev.filter(m => m.store.id !== merchant.store.id));
      setMessage({
        type: 'success',
        text: isArabic
          ? `تم حذف متجر «${merchant.store.name}» وجميع بياناته بنجاح.`
          : `Store "${merchant.store.name}" and all associated data deleted successfully.`,
      });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || (isArabic ? 'فشل حذف المتجر' : 'Failed to delete store'),
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenewSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMerchantForRenew) return;

    try {
      setActionLoading(true);
      const updatedSub = await api.renewSubscription(selectedMerchantForRenew.store.id, renewMonths);
      setMerchants(prev =>
        prev.map(m =>
          m.store.id === selectedMerchantForRenew.store.id
            ? { ...m, subscription: updatedSub }
            : m
        )
      );
      const isSub = renewMonths < 0;
      const absMonths = Math.abs(renewMonths);
      setMessage({
        type: 'success',
        text: isArabic
          ? isSub
            ? `تم خصم ${absMonths} شهر من اشتراك متجر «${selectedMerchantForRenew.store.name}»، الصلاحية حتى ${updatedSub.end_date}.`
            : `تم تمديد اشتراك متجر «${selectedMerchantForRenew.store.name}» لمدة ${renewMonths} شهر حتى ${updatedSub.end_date}!`
          : isSub
            ? `Deducted ${absMonths} month(s) from "${selectedMerchantForRenew.store.name}". New Expiry: ${updatedSub.end_date}.`
            : `Subscription for "${selectedMerchantForRenew.store.name}" extended for ${renewMonths} months until ${updatedSub.end_date}!`,
      });
      setIsRenewModalOpen(false);
      setSelectedMerchantForRenew(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || (isArabic ? 'فشل تجديد الاشتراك' : 'Subscription renewal failed') });
    } finally {
      setActionLoading(false);
    }
  };

  // Filter logic
  const filteredMerchants = merchants.filter(m => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      m.store.name.toLowerCase().includes(q) ||
      m.store.activity_type.toLowerCase().includes(q) ||
      m.user.username.toLowerCase().includes(q) ||
      m.store.whatsapp_number.includes(q)
    );

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return m.store.is_active === 1;
    if (statusFilter === 'pending') return m.store.is_active === 0 && m.user.is_active === 1;
    if (statusFilter === 'valid') return m.subscription.status === 'active';
    if (statusFilter === 'expired') return m.subscription.status !== 'active';
    return true;
  });

  const totalStores = merchants.length;
  const activeStores = merchants.filter(m => m.store.is_active === 1).length;
  const activeSubscriptions = merchants.filter(m => m.subscription.status === 'active').length;
  const expiredSubscriptions = totalStores - activeSubscriptions;
  const pendingStores = merchants.filter(m => m.store.is_active === 0 && m.user.is_active === 1).length;
  const openStores = (filter: typeof statusFilter) => {
    setStatusFilter(filter);
    document.getElementById('admin-store-management')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Real Monthly Bars data computed directly from Cloudflare D1 traffic_stats!
  const monthLabels = isArabic
    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const currentMonthIdx = new Date().getMonth();
  const monthsToShow: number[] = [];
  for (let i = 0; i <= currentMonthIdx; i++) {
    monthsToShow.push(i);
  }
  while (monthsToShow.length < 6 && monthsToShow.length < 12) {
    monthsToShow.push(monthsToShow.length);
  }

  const monthlyData = monthsToShow.map(mIdx => {
    const monthNumStr = String(mIdx + 1).padStart(2, '0');
    const visits = platformAnalytics.monthMap[`${new Date().getFullYear()}-${monthNumStr}`] || 0;
    return {
      month: monthLabels[mIdx],
      visits,
      isCurrent: mIdx === currentMonthIdx,
    };
  });

  const maxVisits = Math.max(...monthlyData.map(d => d.visits), 1);

  const monthlyChartBars = monthlyData.map(d => {
    const pct = d.visits > 0 ? Math.max(20, Math.round((d.visits / maxVisits) * 100)) : 10;
    return {
      month: d.month,
      visits: d.visits.toLocaleString(isArabic ? 'ar-EG' : 'en-US'),
      heightPct: pct,
      color: d.visits > 0
        ? d.isCurrent ? 'bg-[#0084d6]' : 'bg-[#38bdf8]'
        : 'bg-slate-200 dark:bg-slate-700',
    };
  });

  return (
    <div className="min-h-screen bg-[#f7fafe] dark:bg-[#0b1329] text-slate-800 dark:text-slate-100 flex flex-col font-cairo transition-colors selection:bg-sky-100 selection:text-sky-900">
      
      {/* A separate workspace for platform administration. */}
      <header hidden={embedded} className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-40 px-3 sm:px-6 lg:px-8 py-3 transition-colors shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          
          {/* Logo & Platform Info */}
          <div className="flex items-center gap-3 sm:gap-5 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={logoSrc}
                alt="دعيدر للحلول البرمجية"
                className="w-10 h-10 object-contain rounded-2xl shadow-xs bg-white dark:bg-[#0b1628] border border-slate-200/80 dark:border-slate-800 p-0.5"
              />
              <div className="min-w-0">
                <span className="font-extrabold text-[#0e1f38] dark:text-white text-sm sm:text-base tracking-tight block truncate">
                  {t('daidar_solutions')}
                </span>
                <span className="text-[10px] sm:text-[11px] text-[#0084d6] dark:text-sky-400 font-bold block -mt-0.5 truncate">
                  {isArabic ? 'إدارة منصة متجري' : 'Matjari Administration'}
                </span>
              </div>
            </div>

            {/* Nav Pill Badge */}
            <div className="hidden lg:flex items-center gap-2">
              <span className="px-4 py-1.5 rounded-full bg-[#e6f4fe] dark:bg-sky-950/70 text-[#0084d6] dark:text-sky-400 font-extrabold text-xs flex items-center gap-1.5 border border-sky-200/60 dark:border-sky-800/60">
                <Shield className="w-3.5 h-3.5 text-[#0084d6] dark:text-sky-400" />
                <span>{t('manage_stores_subs')}</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] flex items-center gap-1 border border-emerald-200/60 dark:border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{isArabic ? 'مساحة الإدارة' : 'Admin workspace'}</span>
              </span>
            </div>
          </div>

          {/* Action Area: Create Store + Theme + Language + Modern Logout Button */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            
            {/* Explore Stores Action for Super Admin */}
            {onExploreStores && (
              <button
                onClick={onExploreStores}
                className="px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl bg-[#e6f4fe] dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/80 active:scale-95 text-[#0084d6] dark:text-sky-300 font-extrabold text-xs sm:text-sm flex items-center gap-1.5 border border-sky-200 dark:border-sky-800 transition-all cursor-pointer"
                title={t('explore_stores')}
              >
                <Compass className="w-4 h-4 text-[#0084d6] dark:text-sky-400" />
                <span className="hidden sm:inline">{t('explore_stores')}</span>
              </button>
            )}

            {/* Create New Store Primary Action in Daidar Blue */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-[#0084d6] hover:bg-[#0074bd] active:scale-95 text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-sky-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('create_store')}</span>
            </button>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="px-2.5 sm:px-3 py-2 rounded-2xl text-xs font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 transition-colors flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5 text-[#0084d6] dark:text-sky-400" />
              <span className="hidden sm:inline">{t('lang_switch')}</span>
            </button>

            {/* USER REQUESTED LOGOUT BUTTON (Exact match for media_1792971957561_a426e311.png) */}
            <button
              onClick={onLogout}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#fff1f2] hover:bg-[#ffe4e6] dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-[#e11d48] dark:text-rose-400 border border-[#fecdd3] dark:border-rose-900/70 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer shrink-0"
              title={t('logout')}
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5 text-[#e11d48] dark:text-rose-400" />
            </button>

          </div>

        </div>
      </header>

      {/* 2. MAIN DASHBOARD CONTENT */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 flex-1 space-y-6">
        {!embedded&&<EcosystemPanel system="store" ar={isArabic}/>}
        {!embedded&&<EcosystemAdmin ar={isArabic}/>}
        <section aria-labelledby="admin-workspace-title" className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0e1f38] via-[#142e4d] to-[#12566b] p-6 text-white shadow-xl shadow-slate-900/10 sm:p-9">
          <div aria-hidden="true" className="pointer-events-none absolute -end-16 -top-24 h-80 w-80 rounded-full border-[40px] border-white/5" />
          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-cyan-200"><Shield size={14}/>{isArabic ? 'لوحة إدارة المنصة' : 'Platform administration'}</span>
              <h1 id="admin-workspace-title" className="mt-5 text-3xl font-black leading-tight sm:text-4xl">{isArabic ? 'كل متاجرك، تحت سيطرتك.' : 'Your platform. One clear view.'}</h1>
              <p className="mt-3 max-w-lg text-sm leading-7 text-slate-300">{isArabic ? 'راجع طلبات التفعيل، تابع الاشتراكات، وأدر حسابات التجار من مكان واحد.' : 'Review activation requests, follow subscriptions, and manage merchant accounts in one place.'}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={()=>setIsCreateModalOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-slate-900 hover:bg-cyan-50"><Plus size={17}/>{isArabic ? 'إضافة متجر جديد' : 'Add a store'}</button>
                <button type="button" onClick={()=>void loadMerchants()} disabled={isLoading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/10 disabled:opacity-50"><RefreshCw size={16} className={isLoading?'animate-spin':''}/>{isArabic ? 'تحديث البيانات' : 'Refresh data'}</button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={()=>openStores('pending')} className="rounded-2xl border border-amber-200/20 bg-amber-200/10 p-5 text-start transition hover:bg-amber-200/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
                <Clock size={20} className="mb-3 text-amber-200"/><span className="block text-sm font-bold text-amber-100">{isArabic ? 'بانتظار التفعيل' : 'Awaiting activation'}</span><strong className="mt-2 block text-4xl font-black">{isLoading?'—':pendingStores.toLocaleString(isArabic?'ar-EG':'en-US')}</strong><span className="mt-3 block text-xs text-slate-300">{isArabic ? 'مراجعة المتاجر الجديدة ←' : 'Review new stores →'}</span>
              </button>
              <button type="button" onClick={()=>openStores('expired')} className="rounded-2xl border border-white/15 bg-white/5 p-5 text-start transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
                <Calendar size={20} className="mb-3 text-cyan-200"/><span className="block text-sm font-bold text-slate-200">{isArabic ? 'اشتراكات تحتاج مراجعة' : 'Subscriptions to review'}</span><strong className="mt-2 block text-4xl font-black">{isLoading?'—':expiredSubscriptions.toLocaleString(isArabic?'ar-EG':'en-US')}</strong><span className="mt-3 block text-xs text-slate-300">{isArabic ? 'متابعة التجديدات ←' : 'Review renewals →'}</span>
              </button>
            </div>
          </div>
        </section>
        
        {/* Toast / Notification Banner */}
        {message && (
          <div
            className={`p-4 rounded-3xl border text-xs sm:text-sm font-bold flex items-center justify-between shadow-xs animate-fadeIn ${
              message.type === 'success'
                ? 'bg-[#e6f4fe] dark:bg-sky-950/50 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200'
                : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {message.type === 'success' ? <CheckCircle className="w-5 h-5 text-[#0084d6]" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 3. INTERACTIVE STAT CARDS (Clickable to Filter by Status!) */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#0084d6]" />
              <span>{isArabic ? 'إحصائيات المنصة السحابية • اضغط على أي بطاقة لتصفية المتاجر مباشرة' : 'Platform Analytics • Click any card to filter stores instantly'}</span>
            </span>
            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                className="text-xs font-extrabold text-[#0084d6] dark:text-sky-400 hover:underline flex items-center gap-1"
              >
                <span>{isArabic ? 'إلغاء التصفية' : 'Reset Filter'}</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Card 1: Total Stores */}
            <div
              onClick={() => setStatusFilter('all')}
              className={`p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border transition-all duration-200 cursor-pointer group hover:-translate-y-1 ${
                statusFilter === 'all'
                  ? 'border-[#0084d6] ring-2 ring-[#0084d6]/40 shadow-xl shadow-sky-500/10 bg-gradient-to-br from-white to-sky-50/50 dark:from-slate-900 dark:to-sky-950/30'
                  : 'border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-sky-500/5 hover:border-sky-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-300 group-hover:text-[#0084d6] transition-colors">{t('total_stores')}</span>
                <div className="w-9 h-9 rounded-2xl bg-[#e6f4fe] dark:bg-sky-950/70 text-[#0084d6] dark:text-sky-400 flex items-center justify-center shadow-xs">
                  <StoreIcon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-black text-[#0084d6] dark:text-sky-400">
                {totalStores}
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{t('total_stores_sub')}</span>
                {statusFilter === 'all' && (
                  <span className="text-[10px] font-black text-[#0084d6] dark:text-sky-400 bg-[#e6f4fe] dark:bg-sky-950/70 px-2 py-0.5 rounded-full">
                    {isArabic ? 'محدد ✓' : 'Active'}
                  </span>
                )}
              </div>
            </div>

            {/* Card 2: Active Stores */}
            <div
              onClick={() => setStatusFilter(prev => prev === 'active' ? 'all' : 'active')}
              className={`p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border transition-all duration-200 cursor-pointer group hover:-translate-y-1 ${
                statusFilter === 'active'
                  ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-xl shadow-emerald-500/10 bg-gradient-to-br from-white to-emerald-50/50 dark:from-slate-900 dark:to-emerald-950/30'
                  : 'border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-sky-500/5 hover:border-emerald-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-300 group-hover:text-emerald-600 transition-colors">{t('active_stores')}</span>
                <div className="w-9 h-9 rounded-2xl bg-emerald-100/80 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-black text-[#0e1f38] dark:text-white">
                {activeStores}
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{t('active_stores_sub')}</span>
                {statusFilter === 'active' && (
                  <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 px-2 py-0.5 rounded-full">
                    {isArabic ? 'محدد ✓' : 'Active'}
                  </span>
                )}
              </div>
            </div>

            {/* Card 3: Active Subscriptions */}
            <div
              onClick={() => setStatusFilter(prev => prev === 'valid' ? 'all' : 'valid')}
              className={`p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border transition-all duration-200 cursor-pointer group hover:-translate-y-1 ${
                statusFilter === 'valid'
                  ? 'border-[#00b4d8] ring-2 ring-[#00b4d8]/40 shadow-xl shadow-cyan-500/10 bg-gradient-to-br from-white to-sky-50/50 dark:from-slate-900 dark:to-sky-950/30'
                  : 'border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-sky-500/5 hover:border-cyan-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-300 group-hover:text-[#00b4d8] transition-colors">{t('active_subscriptions')}</span>
                <div className="w-9 h-9 rounded-2xl bg-sky-100/80 dark:bg-sky-950/70 text-[#00b4d8] dark:text-sky-400 flex items-center justify-center shadow-xs">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-black text-[#00b4d8] dark:text-sky-400">
                {activeSubscriptions}
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{t('active_subscriptions_sub')}</span>
                {statusFilter === 'valid' && (
                  <span className="text-[10px] font-black text-sky-800 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/70 px-2 py-0.5 rounded-full">
                    {isArabic ? 'محدد ✓' : 'Active'}
                  </span>
                )}
              </div>
            </div>

            {/* Card 4: Needs Renewal */}
            <div
              onClick={() => setStatusFilter(prev => prev === 'expired' ? 'all' : 'expired')}
              className={`p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border transition-all duration-200 cursor-pointer group hover:-translate-y-1 ${
                statusFilter === 'expired'
                  ? 'border-amber-500 ring-2 ring-amber-500/40 shadow-xl shadow-amber-500/10 bg-gradient-to-br from-white to-amber-50/50 dark:from-slate-900 dark:to-amber-950/30'
                  : 'border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-sky-500/5 hover:border-amber-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-300 group-hover:text-amber-600 transition-colors">{t('need_renewal')}</span>
                <div className="w-9 h-9 rounded-2xl bg-amber-100/80 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                {expiredSubscriptions}
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{t('need_renewal_sub')}</span>
                {statusFilter === 'expired' && (
                  <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 px-2 py-0.5 rounded-full">
                    {isArabic ? 'محدد ✓' : 'Active'}
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* 4. INTERACTIVE ANALYTICS & ACTIVITY CARD (Matching Screenshot Mockup Style) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-sky-500/5 overflow-hidden transition-all">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#e6f4fe] dark:bg-sky-950/70 text-[#0084d6] dark:text-sky-400 flex items-center justify-center font-bold">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#0e1f38] dark:text-white text-xs sm:text-sm">
                  {isArabic ? 'نشاط المتاجر والطلبات' : 'Stores and orders activity'}
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {isArabic ? 'ملخص البيانات المسجلة على المنصة' : 'An overview of recorded platform data'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>{showAnalytics ? (isArabic ? 'إخفاء' : 'Hide') : (isArabic ? 'عرض' : 'Expand')}</span>
              {showAnalytics ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showAnalytics && (
            <div className="p-4 sm:p-6 space-y-5 animate-fadeIn">
              
              {/* Quick Summary Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#f0f7ff] dark:bg-slate-800/90 border border-sky-100 dark:border-slate-700 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#0084d6] text-white flex items-center justify-center font-bold">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">{isArabic ? 'إجمالي طلبات الواتساب' : 'WhatsApp Orders'}</span>
                    <span className="text-lg font-black text-[#0084d6] dark:text-sky-400">
                      {platformAnalytics.totalOrders} {isArabic ? 'طلب' : 'Orders'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#f0f7ff] dark:bg-slate-800/90 border border-sky-100 dark:border-slate-700 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#0e1f38] text-[#00b4d8] flex items-center justify-center font-bold">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">{isArabic ? 'المنتجات المعروضة للزبائن' : 'Published Products'}</span>
                    <span className="text-lg font-black text-[#0e1f38] dark:text-white">
                      {merchants.reduce((sum, m) => sum + (m.productCount || 0), 0)} {isArabic ? 'منتج' : 'Items'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#f0f7ff] dark:bg-slate-800/90 border border-sky-100 dark:border-slate-700 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#00b4d8] text-white flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">{isArabic ? 'متاجر بانتظار التفعيل' : 'Pending activation'}</span>
                    <span className="text-lg font-black text-[#00b4d8]">{pendingStores.toLocaleString(isArabic?'ar-EG':'en-US')}</span>
                  </div>
                </div>
              </div>

              {/* Interactive Performance Bars */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-[#0e1f38] dark:text-slate-200">
                    {isArabic ? 'الطلبات المسجلة شهرياً' : 'Recorded orders by month'}
                  </span>
                  <span className="text-[10px] font-bold text-[#0084d6] dark:text-sky-400 bg-sky-100/70 dark:bg-sky-950/70 px-2.5 py-0.5 rounded-full">
                    {isArabic ? 'بيانات فعلية' : 'Recorded data'}
                  </span>
                </div>

                <div className="h-28 flex items-end justify-between gap-2 pt-3 px-2">
                  {monthlyChartBars.map((bar, idx) => (
                    <div key={idx} className="flex-1 h-full flex flex-col justify-end items-center gap-1 group relative">
                      {/* Tooltip on Hover */}
                      <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold py-0.5 px-1.5 rounded-md pointer-events-none whitespace-nowrap z-20 shadow-xs">
                        {bar.visits} {isArabic ? 'طلب' : 'orders'}
                      </div>
                      <div
                        style={{ height: `${bar.heightPct}%` }}
                        className={`w-full rounded-t-lg transition-all duration-300 group-hover:opacity-80 ${bar.color}`}
                      ></div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate max-w-full">
                        {bar.month}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* 5. MERCHANTS MANAGEMENT CARD & FILTER TABS */}
        <div id="admin-store-management" className="scroll-mt-28 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-sky-500/5 space-y-4">
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#0e1f38] dark:text-white tracking-tight">
                {t('merchant_mgmt_title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {t('merchant_mgmt_desc')}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onExploreStores && (
                <button
                  onClick={onExploreStores}
                  className="px-4 py-3 rounded-2xl bg-[#e6f4fe] hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/80 text-[#0084d6] dark:text-sky-300 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 border border-sky-200 dark:border-sky-800 shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
                >
                  <Compass className="w-4 h-4 text-[#0084d6] dark:text-sky-400" />
                  <span>{t('explore_stores')}</span>
                </button>
              )}

              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-5 py-3 rounded-2xl bg-[#0084d6] hover:bg-[#0074bd] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-600/25 active:scale-95 transition-all shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('create_merchant_btn')}</span>
                <span>{isArabic ? '←' : '→'}</span>
              </button>
            </div>
          </div>

          {/* Search Box with Clear Button */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search_merchants_placeholder')}
              className="w-full px-4 py-3 ps-10 pe-10 rounded-2xl border border-slate-200 dark:border-slate-700 bg-[#f7fafe] dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-white focus:outline-hidden focus:border-[#0084d6] focus:bg-white focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900/30 transition-all shadow-2xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute top-3.5 start-3.5" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute top-3 end-3 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
                title={t('clear_search')}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Pills Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#0084d6] text-white shadow-md shadow-sky-600/20'
                  : 'bg-[#f7fafe] dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {t('filter_all')} ({totalStores})
            </button>

            <button
              onClick={() => setStatusFilter('active')}
              className={`px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-[#f7fafe] dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {t('filter_active')} ({activeStores})
            </button>

            <button
              onClick={() => setStatusFilter('valid')}
              className={`px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === 'valid'
                  ? 'bg-[#00b4d8] text-white shadow-md shadow-cyan-600/20'
                  : 'bg-[#f7fafe] dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {t('filter_valid_subs')} ({activeSubscriptions})
            </button>

            <button
              onClick={() => setStatusFilter('expired')}
              className={`px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === 'expired'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'bg-[#f7fafe] dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {t('filter_need_renewal')} ({expiredSubscriptions})
            </button>
            <button type="button" onClick={()=>setStatusFilter('pending')} aria-pressed={statusFilter==='pending'} className={`rounded-full border px-4 py-2 text-xs font-extrabold whitespace-nowrap ${statusFilter==='pending'?'border-amber-600 bg-amber-600 text-white':'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200'}`}>
              {isArabic ? 'بانتظار التفعيل' : 'Awaiting activation'} ({pendingStores})
            </button>
          </div>

        </div>

        {/* 6. MERCHANTS TABLE (High contrast, modern pills & action buttons) */}
        {isLoading ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-sky-500/5">
            <div className="w-10 h-10 border-3 border-[#0084d6] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-500">{t('loading_merchants')}</p>
          </div>
        ) : filteredMerchants.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 space-y-3 shadow-2xl shadow-sky-500/5">
            <StoreIcon className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('no_merchants_found')}</h3>
            <p className="text-xs text-slate-400">{t('no_merchants_hint')}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-sky-500/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="bg-[#f0f7ff] dark:bg-slate-800 text-[#0e1f38] dark:text-white font-black border-b border-sky-100 dark:border-slate-700">
                  <tr>
                    <th className="p-4 text-start">{t('col_store')}</th>
                    <th className="p-4 text-start">{t('col_username')}</th>
                    <th className="p-4 text-start">{t('col_products')}</th>
                    <th className="p-4 text-start">{t('col_status')}</th>
                    <th className="p-4 text-start">{t('col_subscription')}</th>
                    <th className="p-4 text-center">{t('col_actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredMerchants.map((m) => {
                    const isStoreActive = m.store.is_active === 1;
                    const isSubActive = m.subscription.status === 'active';
                    const isCopied = copiedStoreId === m.store.id;

                    return (
                      <tr key={m.store.id} className="hover:bg-[#f7fafe] dark:hover:bg-slate-800/50 transition-colors">
                        
                        {/* Store Info */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={m.store.logo_data || logoSrc}
                              alt={m.store.name}
                              className="w-10 h-10 rounded-2xl object-contain bg-[#f7fafe] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 shrink-0 shadow-2xs"
                            />
                            <div>
                              <div className="font-extrabold text-[#0e1f38] dark:text-white text-sm">
                                {m.store.name}
                              </div>
                              <span className="text-[11px] text-slate-500 dark:text-slate-300 block font-medium">
                                {m.store.activity_type}
                              </span>
                              <div className="text-[10px] text-[#0084d6] dark:text-sky-400 font-mono mt-0.5 dir-ltr text-start font-bold">
                                WhatsApp: {m.store.whatsapp_number}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Login Credential */}
                        <td className="p-4">
                          <div className="space-y-1">
                            <span className="px-2.5 py-1 rounded-xl bg-[#e6f4fe] dark:bg-sky-950/70 font-mono font-bold text-[#0084d6] dark:text-sky-300 text-xs inline-block">
                              {m.user.username}
                            </span>
                            <span className="block text-[10px] text-slate-500 dark:text-slate-300 font-medium">
                              {t('merchant_role')}
                            </span>
                          </div>
                        </td>

                        {/* Product Count */}
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                            <Package className="w-3.5 h-3.5 text-[#0084d6] dark:text-sky-400" />
                            <span>{m.productCount || 0} {isArabic ? 'منتج' : 'products'}</span>
                          </div>
                        </td>

                        {/* Store Active Status */}
                        <td className="p-4">
                          {isStoreActive ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>{t('active_status')}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              <XCircle className="w-3 h-3" />
                              <span>{t('inactive_status')}</span>
                            </span>
                          )}
                        </td>

                        {/* Subscription Info */}
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="font-extrabold text-[#0e1f38] dark:text-white text-xs">
                              {m.subscription.plan_name || t('annual_plan')}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-200 font-medium">
                              <Calendar className="w-3 h-3 text-[#0084d6] dark:text-sky-400" />
                              <span>{t('expires_on')} {m.subscription.end_date}</span>
                            </div>
                            {isSubActive ? (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">{t('status_valid')}</span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-500 dark:text-amber-300 block">{t('status_expired')}</span>
                            )}
                          </div>
                        </td>

                        {/* Actions in Modern Pills & Exact requested aesthetics */}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            
                            {/* Toggle Active Button (Modern Soft Pill) */}
                            <button
                              onClick={() => handleToggleStatus(m)}
                              disabled={actionLoading}
                              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer active:scale-95 ${
                                isStoreActive
                                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-900'
                                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-900'
                              }`}
                              title={isStoreActive ? t('deactivate_btn') : t('activate_btn')}
                            >
                              {isStoreActive ? t('deactivate_btn') : t('activate_btn')}
                            </button>

                            {/* Manual Subscription Renew (Modern Sky Pill) */}
                            <button
                              onClick={() => {
                                setSelectedMerchantForRenew(m);
                                setRenewMode('add');
                                setRenewMonths(12);
                                setIsRenewModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-[#e6f4fe] dark:bg-sky-950/60 text-[#0084d6] dark:text-sky-300 hover:bg-sky-100 font-bold text-[11px] border border-sky-200 dark:border-sky-800 flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                              title={t('renew_sub_btn')}
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>{t('renew_sub_btn')}</span>
                            </button>

                            {/* Copy Store URL Quick Action */}
                            <button
                              onClick={() => handleCopyStoreLink(m.store.id)}
                              className={`p-1.5 rounded-xl border font-bold text-[11px] flex items-center transition-all cursor-pointer active:scale-95 ${
                                isCopied
                                  ? 'bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                                  : 'bg-[#f7fafe] dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                              }`}
                              title={t('copy_store_url')}
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#0084d6]" />}
                            </button>

                            {/* Direct Preview Button (Matching Screenshot Mockup Pill in Dark Navy) */}
                            <button
                              onClick={() => onPreviewStore(m.store.id)}
                              className="px-3 py-1.5 rounded-xl bg-[#0e1f38] dark:bg-slate-700 hover:bg-[#152a4a] dark:hover:bg-slate-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-all cursor-pointer active:scale-95"
                              title={t('preview_store_btn')}
                            >
                              <span>{t('preview_store_btn')}</span>
                              <ExternalLink className="w-3 h-3 text-[#00b4d8]" />
                            </button>

                            {/* Delete Store Action (Red Pill with Trash2) */}
                            <button
                              style={embedded?{display:'none'}:undefined}
                              onClick={() => handleDeleteStore(m)}
                              disabled={actionLoading}
                              className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/80 border border-rose-200 dark:border-rose-900 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                              title={t('delete_store_btn')}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            </button>

                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* CREATE NEW STORE OWNER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-cairo">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-fadeIn space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#0084d6] text-white flex items-center justify-center shadow-xs">
                  <StoreIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-[#0e1f38] dark:text-white text-base">{t('modal_create_store_title')}</h3>
                  <span className="text-[11px] text-[#0084d6] font-bold">{t('modal_admin_subtitle')}</span>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMerchant} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-[#0e1f38] dark:text-white mb-1">
                  {t('store_name')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  placeholder={t('store_name_placeholder')}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:border-[#0084d6] focus:ring-4 focus:ring-sky-100 placeholder:text-slate-400 dark:placeholder:text-slate-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#0e1f38] dark:text-white mb-1">
                  {t('store_activity_type')}
                </label>
                <input
                  type="text"
                  value={newActivityType}
                  onChange={(e) => setNewActivityType(e.target.value)}
                  placeholder={t('activity_example')}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:border-[#0084d6] focus:ring-4 focus:ring-sky-100 placeholder:text-slate-400 dark:placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#0e1f38] dark:text-white mb-1">
                  {t('store_whatsapp')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={newWhatsapp}
                  onChange={(e) => setNewWhatsapp(e.target.value)}
                  placeholder="201012345678"
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:border-[#0084d6] font-mono dir-ltr text-start placeholder:text-slate-400 dark:placeholder:text-slate-400"
                  required
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-300 mt-1 block">
                  {t('whatsapp_sub_hint')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-extrabold text-[#0e1f38] dark:text-white mb-1">
                    {t('username_label')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder={t('username_example')}
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:border-[#0084d6] font-mono text-start placeholder:text-slate-400 dark:placeholder:text-slate-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#0e1f38] dark:text-white mb-1">
                    {t('password_label')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:border-[#0084d6] font-mono text-start placeholder:text-slate-400 dark:placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-extrabold text-[#0e1f38] dark:text-white mb-1">
                    {t('subscription_duration')}
                  </label>
                  <select
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-[#0084d6] dark:text-sky-400"
                  >
                    <option value={1}>{t('trial_month')}</option>
                    <option value={6}>{t('semi_annual')}</option>
                    <option value={12}>{t('full_year')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#0e1f38] dark:text-white mb-1">
                    {t('subscription_price')}
                  </label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:border-[#0084d6]"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-2.5">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3.5 rounded-2xl bg-[#0084d6] hover:bg-[#0074bd] text-white font-black text-xs sm:text-sm shadow-lg shadow-sky-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {actionLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span>{t('save_create_d1')}</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* RENEW SUBSCRIPTION MODAL */}
      {isRenewModalOpen && selectedMerchantForRenew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-cairo">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 max-w-md w-full shadow-2xl animate-fadeIn space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-[#0084d6]" />
                <h3 className="font-black text-[#0e1f38] dark:text-white text-base">{t('modal_renew_title')}</h3>
              </div>
              <button
                onClick={() => {
                  setIsRenewModalOpen(false);
                  setSelectedMerchantForRenew(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#e6f4fe] dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-xs text-slate-800 dark:text-slate-200 space-y-1">
              <div className="font-black text-[#0084d6] text-sm">
                {selectedMerchantForRenew.store.name}
              </div>
              <div>• {t('current_plan')} {selectedMerchantForRenew.subscription.plan_name || t('annual_plan')}</div>
              <div>• {t('current_expiry')} {selectedMerchantForRenew.subscription.end_date}</div>
            </div>

            {/* Operation Type Switcher: Add (+) or Deduct/Subtract (-) */}
            <div>
              <label className="block text-xs font-extrabold text-[#0e1f38] dark:text-white mb-2">
                {t('operation_type')}
              </label>
              <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl gap-1 border border-slate-200/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => {
                    setRenewMode('add');
                    setRenewMonths(12);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    renewMode === 'add'
                      ? 'bg-white dark:bg-slate-900 text-[#0084d6] dark:text-sky-400 shadow-xs border border-slate-200/50 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#0084d6]"></span>
                  <span>{t('mode_add_time')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRenewMode('subtract');
                    setRenewMonths(-1);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    renewMode === 'subtract'
                      ? 'bg-white dark:bg-slate-900 text-[#e11d48] dark:text-rose-400 shadow-xs border border-slate-200/50 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>{t('mode_sub_time')}</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleRenewSubscription} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-[#0e1f38] dark:text-white mb-2">
                  {t('choose_renew_duration')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(renewMode === 'add' ? [
                    { label: t('plus_1_month'), value: 1 },
                    { label: t('plus_6_months'), value: 6 },
                    { label: t('plus_1_year'), value: 12 },
                  ] : [
                    { label: t('minus_1_month'), value: -1 },
                    { label: t('minus_6_months'), value: -6 },
                    { label: t('minus_1_year'), value: -12 },
                  ]).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRenewMonths(option.value)}
                      className={`p-3 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
                        renewMonths === option.value
                          ? renewMode === 'add'
                            ? 'border-[#0084d6] bg-[#0084d6] text-white shadow-md shadow-sky-600/25'
                            : 'border-rose-600 bg-rose-600 text-white shadow-md shadow-rose-600/25'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Expected Expiry Date Preview */}
              {(() => {
                const cur = selectedMerchantForRenew.subscription.end_date;
                if (!cur) return null;
                const parts = cur.split('-').map(Number);
                if (parts.length !== 3) return null;
                const d = new Date(parts[0], parts[1] - 1 + renewMonths, parts[2]);
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                const previewDate = `${yyyy}-${mm}-${dd}`;

                return (
                  <div className={`p-3 rounded-2xl flex items-center justify-between text-xs font-bold border transition-colors ${
                    renewMode === 'add'
                      ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-[#0084d6] dark:text-sky-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300'
                  }`}>
                    <span>{t('new_expected_expiry')}</span>
                    <span className="font-mono font-black text-xs sm:text-sm px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 shadow-2xs border border-black/5 dark:border-white/5">
                      {previewDate}
                    </span>
                  </div>
                );
              })()}

              <div className="pt-2 flex gap-2.5">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`flex-1 py-3.5 rounded-2xl text-white font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 ${
                    renewMode === 'add'
                      ? 'bg-[#0084d6] hover:bg-[#0074bd] shadow-sky-600/25'
                      : 'bg-[#e11d48] hover:bg-[#be123c] shadow-rose-600/25'
                  }`}
                >
                  {actionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{renewMode === 'add' ? t('confirm_renew_btn') : t('confirm_deduct_btn')}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRenewModalOpen(false);
                    setSelectedMerchantForRenew(null);
                  }}
                  className="px-5 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
