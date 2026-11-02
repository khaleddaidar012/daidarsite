import React, { useEffect, useState } from 'react';
import {
  Users,
  TrendingUp,
  Smartphone,
  Monitor,
  Globe,
  RefreshCw,
  Eye,
  ArrowUpRight,
  Sparkles,
  ShoppingBag,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { TrafficStats, Store } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

interface GeneralInfoViewProps {
  store: Store | null;
  onNavigateToProducts: () => void;
  onNavigateToStore: () => void;
}

export const GeneralInfoView: React.FC<GeneralInfoViewProps> = ({
  store,
  onNavigateToProducts,
  onNavigateToStore,
}) => {
  const [stats, setStats] = useState<TrafficStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'7days' | '30days'>('7days');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [isSimulatingVisit, setIsSimulatingVisit] = useState(false);
  const [isSimulatingOrder, setIsSimulatingOrder] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  const { t, isArabic } = useLanguage();
  const currency = store?.currency || (isArabic ? 'ج.م' : '$');

  const fetchStats = async (selectedRange = range) => {
    try {
      setLoading(true);
      const data = await api.getTrafficStats(store?.id, selectedRange);
      setStats(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching traffic stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(range);
  }, [store?.id, range]);

  // Interactive Live Visitor Simulation
  const handleSimulateLiveVisit = async () => {
    if (!store?.id || isSimulatingVisit) return;
    try {
      setIsSimulatingVisit(true);
      const res = await api.simulateVisit(store.id);
      setActionNotice(isArabic ? 'تم تسجيل زيارة عميل جديدة الآن بنجاح في قاعدة بيانات D1!' : 'New live visitor recorded successfully in Cloudflare D1!');
      setTimeout(() => setActionNotice(null), 4000);
      await fetchStats(range);
    } catch (err) {
      console.error('Failed simulating visit:', err);
    } finally {
      setIsSimulatingVisit(false);
    }
  };

  // Interactive Live Order Simulation
  const handleSimulateLiveOrder = async () => {
    if (!store?.id || isSimulatingOrder) return;
    try {
      setIsSimulatingOrder(true);
      const res = await api.simulateOrder(store.id);
      setActionNotice(isArabic ? `تم تسجيل طلب شراء واتساب جديد بقيمة ${res.total_price} ${currency} للعميل (${res.customer_name})!` : `New WhatsApp order recorded for ${res.customer_name}!`);
      setTimeout(() => setActionNotice(null), 4000);
      await fetchStats(range);
    } catch (err) {
      console.error('Failed simulating order:', err);
    } finally {
      setIsSimulatingOrder(false);
    }
  };

  // Reset Stats to 0
  const handleResetStats = async () => {
    if (!store?.id || isResetting) return;
    const confirmReset = window.confirm(
      isArabic
        ? 'هل ترغب في تصفير جميع الإحصائيات والزيارات والطلبات والبدء من الصفر (0)؟'
        : 'Do you want to reset all visits and orders to 0?'
    );
    if (!confirmReset) return;

    try {
      setIsResetting(true);
      await api.resetStats(store.id);
      setActionNotice(isArabic ? 'تم تصفير جميع الإحصائيات بنجاح والبدء من الصفر (0)!' : 'All statistics reset to 0!');
      setTimeout(() => setActionNotice(null), 4000);
      await fetchStats(range);
    } catch (err) {
      console.error('Failed resetting stats:', err);
    } finally {
      setIsResetting(false);
    }
  };

  // Compute Real Device Breakdown Totals
  const totalVisitsCount = stats?.totalVisits || 0;
  
  const mobileCount = (stats?.devices || [])
    .filter(d => d.device.includes('الجوال') || d.device.includes('Mobile') || d.device.includes('هاتف') || d.device.includes('موبايل') || d.device.includes('iPhone') || d.device.includes('Android'))
    .reduce((sum, d) => sum + d.count, 0);

  const desktopCount = (stats?.devices || [])
    .filter(d => d.device.includes('الكمبيوتر') || d.device.includes('Desktop') || d.device.includes('PC') || d.device.includes('Mac'))
    .reduce((sum, d) => sum + d.count, 0);

  const tabletCount = (stats?.devices || [])
    .filter(d => d.device.includes('اللوحية') || d.device.includes('Tablet') || d.device.includes('iPad') || d.device.includes('لوحي'))
    .reduce((sum, d) => sum + d.count, 0);

  const mobilePercent = totalVisitsCount > 0 ? Math.round((mobileCount / totalVisitsCount) * 100) : 0;
  const desktopPercent = totalVisitsCount > 0 ? Math.round((desktopCount / totalVisitsCount) * 100) : 0;
  const tabletPercent = totalVisitsCount > 0 ? Math.round((tabletCount / totalVisitsCount) * 100) : 0;

  // Max visits for bar heights
  const dailyData = stats?.daily || [];
  const maxDayCount = Math.max(...dailyData.map(d => d.count), 1);
  const activeDay = selectedDayIndex !== null && dailyData[selectedDayIndex] ? dailyData[selectedDayIndex] : (dailyData[dailyData.length - 1] || null);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      
      {/* 1. VISITOR TRAFFIC STATISTICS - 100% REAL & INTERACTIVE */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-8 shadow-xs transition-colors">
        
        {/* Header & Interactive Control Bar */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#0084d6] dark:text-sky-400 bg-[#e6f4fe] dark:bg-sky-950/60 px-3.5 py-1.5 rounded-full w-fit mb-2 border border-sky-200/80 dark:border-sky-800/80 shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isArabic ? 'إحصائيات فورية من Cloudflare D1' : 'Real-time Analytics from Cloudflare D1'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {isArabic ? 'إحصائيات وحركة الزوار (Visitor Traffic)' : 'Visitor Traffic & Real-time Analytics'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {isArabic
                ? 'بيانات حقيقية وتفاعلية 100% مسجلة ومحسوبة مباشرة من قاعدة بيانات Cloudflare D1 لمتجرك'
                : '100% authentic, interactive metrics synchronized directly with Cloudflare D1'}
            </p>
          </div>

          {/* Interactive Actions & Range Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Range Toggle: 7 Days vs 30 Days */}
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center border border-slate-200 dark:border-slate-700 text-xs font-black">
              <button
                onClick={() => {
                  setRange('7days');
                  setSelectedDayIndex(null);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  range === '7days'
                    ? 'bg-white dark:bg-slate-900 text-[#0084d6] dark:text-sky-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isArabic ? 'آخر ٧ أيام' : '7 Days'}
              </button>
              <button
                onClick={() => {
                  setRange('30days');
                  setSelectedDayIndex(null);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  range === '30days'
                    ? 'bg-white dark:bg-slate-900 text-[#0084d6] dark:text-sky-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isArabic ? 'آخر ٣٠ يوم (شهري)' : '30 Days (Monthly)'}
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchStats(range)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-black text-[#0084d6] dark:text-sky-300 bg-[#f0f7ff] dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-slate-700 border border-sky-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer shadow-2xs"
              title={isArabic ? 'تحديث البيانات من السيرفر' : 'Refresh data'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0084d6]' : ''}`} />
              <span className="hidden sm:inline">{t('refresh_data')}</span>
            </button>

            {/* Reset to 0 Button */}
            <button
              onClick={handleResetStats}
              disabled={isResetting}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/60 rounded-xl cursor-pointer transition-all disabled:opacity-50"
              title={isArabic ? 'تصفير العدادات والبدء من الصفر النظيف' : 'Reset all stats to 0'}
            >
              <span>{isArabic ? '🔄 تصفير للصفر (0)' : 'Reset to 0'}</span>
            </button>
          </div>
        </div>

        {/* Live Action Toast Banner */}
        {actionNotice && (
          <div className="mb-6 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-black flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{actionNotice}</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-normal">Cloudflare D1 Synced</span>
          </div>
        )}

        {/* 2. TOP METRIC CARDS (ALL COMPUTED FROM REAL SQLITE D1 DATA) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          {/* Card 1: Total Visits */}
          <div className="bg-[#f0f7ff] dark:bg-slate-800/90 border border-sky-100 dark:border-slate-700 rounded-2xl p-5 relative overflow-hidden shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{isArabic ? 'إجمالي الزيارات' : 'Total Visits'}</span>
              <div className="w-10 h-10 rounded-xl bg-[#0084d6] text-white flex items-center justify-center shadow-md shadow-sky-600/20">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                {stats?.totalVisits ?? 0}
              </span>
              <span className={`text-xs font-black px-2 py-0.5 rounded-full border flex items-center gap-0.5 ${
                (stats?.growthRate ?? 0) >= 0
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800'
                  : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800'
              }`}>
                {(stats?.growthRate ?? 0) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180 text-rose-500" />}
                <span>{(stats?.growthRate ?? 0) >= 0 ? `+${stats?.growthRate}%` : `${stats?.growthRate}%`}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isArabic ? 'مؤشر نمو نشط ومحسوب من D1' : 'Live Active Tracker'}</span>
            </div>
          </div>

          {/* Card 2: Today's Visits */}
          <div className="bg-[#f0f7ff] dark:bg-slate-800/90 border border-sky-100 dark:border-slate-700 rounded-2xl p-5 relative overflow-hidden shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{isArabic ? 'زيارات اليوم' : "Today's Visits"}</span>
              <div className="w-10 h-10 rounded-xl bg-[#0e1f38] dark:bg-slate-700 text-white flex items-center justify-center shadow-md shadow-slate-900/15">
                <Eye className="w-5 h-5 text-[#00b4d8]" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                {stats?.todayVisits ?? 0}
              </span>
              <span className="text-xs font-black text-[#0084d6] dark:text-sky-400 bg-sky-100 dark:bg-sky-950/60 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                24h مباشر
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
              {isArabic ? `مقارنة بـ ${stats?.yesterdayVisits ?? 0} زيارة سُجلت بالأمس` : `Compared to ${stats?.yesterdayVisits ?? 0} yesterday`}
            </p>
          </div>

          {/* Card 3: Mobile vs Desktop Breakdown */}
          <div className="bg-[#f0f7ff] dark:bg-slate-800/90 border border-sky-100 dark:border-slate-700 rounded-2xl p-5 relative overflow-hidden shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{isArabic ? 'تصفح المتجر عبر الجوال' : 'Mobile Browsing Rate'}</span>
              <div className="w-10 h-10 rounded-xl bg-[#00b4d8] text-white flex items-center justify-center shadow-md shadow-cyan-500/20">
                <Smartphone className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                {mobilePercent}%
              </span>
              <span className="text-xs font-black text-[#0084d6] dark:text-sky-400">
                {isArabic ? 'تصفح عبر الجوال' : 'Mobile Browsing'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
              {isArabic ? `${mobileCount} زيارة من أصل ${totalVisitsCount} تمت عبر أجهزة الجوال` : `${mobileCount} of ${totalVisitsCount} visits via mobile`}
            </p>
          </div>

          {/* Card 4: Orders & WhatsApp Sales Readiness */}
          <div className="bg-[#f0f7ff] dark:bg-slate-800/90 border border-sky-100 dark:border-slate-700 rounded-2xl p-5 relative overflow-hidden shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{isArabic ? 'طلبات ومبيعات المتجر' : 'Orders & Sales'}</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
                {stats?.ordersSummary?.total_orders ?? 0}
              </span>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                ({stats?.ordersSummary?.total_revenue ?? 0} {currency})
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{isArabic ? 'مسار الواتساب مؤكد ونشط' : 'WhatsApp Checkout Active'}</span>
            </div>
          </div>
        </div>

        {/* 3. INTERACTIVE ACTIVITY CHART & DEVICES BREAKDOWN */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Daily Visits Graphic Bars */}
          <div className="lg:col-span-2 bg-slate-50/70 dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-200/70 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <span>{range === '30days' ? (isArabic ? '📊 حركة النشاط الشهري للمتجر (٣٠ يوم)' : 'Monthly Traffic Activity (30 Days)') : (isArabic ? '📊 حركة النشاط الأسبوعي للمتجر' : 'Weekly Traffic Activity')}</span>
                  <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">(Cloudflare D1)</span>
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-400">
                  {isArabic ? 'انقر فوق أي يوم لمعاينة تاريخه الدقيق وعدد الزيارات المسجلة' : 'Click any bar to inspect specific day metrics'}
                </p>
              </div>

              {activeDay && (
                <div className="text-end">
                  <span className="text-xs font-black text-[#0084d6] dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-3 py-1 rounded-full border border-sky-100 dark:border-sky-800">
                    {activeDay.day}: {activeDay.count} {isArabic ? 'زيارة' : 'visits'}
                  </span>
                </div>
              )}
            </div>

            {/* Monthly Summary Badges when range is 30days */}
            {range === '30days' && stats?.rangeVisits !== undefined && (
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                  {isArabic ? `إجمالي الشهر: ${stats.rangeVisits} زيارة` : `Total: ${stats.rangeVisits} visits`}
                </span>
                <span className="px-3 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-[#0084d6] dark:text-sky-400 font-bold">
                  {isArabic ? `المتوسط اليومي: ~${stats.dailyAverage || 0} زيارة/يوم` : `Daily Avg: ~${stats.dailyAverage || 0}`}
                </span>
                {stats.peakDay && (
                  <span className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold">
                    {isArabic ? `ذروة النشاط: ${stats.peakDay.day} (${stats.peakDay.count} زيارة)` : `Peak: ${stats.peakDay.count}`}
                  </span>
                )}
              </div>
            )}

            {/* Interactive Dynamic Bar Chart */}
            <div
              className={`h-48 flex items-end ${
                range === '30days'
                  ? 'overflow-x-auto pb-4 gap-2 scrollbar-thin'
                  : 'justify-between gap-1.5 sm:gap-3'
              } pt-6 px-1 sm:px-2`}
            >
              {dailyData.map((item, idx) => {
                const heightPercent = Math.min(100, Math.max(12, (item.count / maxDayCount) * 100));
                const isSelected = selectedDayIndex === idx || (selectedDayIndex === null && item.active);

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedDayIndex(idx)}
                    className={`${
                      range === '30days' ? 'min-w-[34px] sm:min-w-[40px] shrink-0' : 'flex-1'
                    } flex flex-col items-center gap-2 group cursor-pointer focus:outline-hidden`}
                  >
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shadow-2xs transition-all ${
                      isSelected
                        ? 'opacity-100 bg-[#0084d6] text-white scale-110 font-black'
                        : 'opacity-0 group-hover:opacity-100 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}>
                      {item.count}
                    </span>
                    
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-t-xl overflow-hidden h-32 flex items-end">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-xl transition-all duration-500 ${
                          isSelected
                            ? 'bg-gradient-to-t from-[#0e1f38] via-[#0084d6] to-[#00b4d8] shadow-md shadow-sky-500/30 brightness-110'
                            : item.active
                            ? 'bg-[#0084d6] opacity-90'
                            : 'bg-gradient-to-t from-slate-400 via-sky-500 to-sky-400 opacity-75 group-hover:opacity-100'
                        }`}
                      />
                    </div>

                    <div className="flex flex-col items-center leading-tight">
                      <span className={`text-[10px] sm:text-[11px] font-bold truncate max-w-full ${
                        isSelected ? 'text-[#0084d6] dark:text-sky-400 font-black' : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {range === '30days' ? (item.dayNumber || item.date?.split('-')[2] || item.day) : item.day}
                      </span>
                      {range === '30days' && item.shortDate && (
                        <span className="text-[9px] text-slate-400 font-medium">
                          {item.shortDate}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Day Footer Info */}
            {activeDay && (
              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#0084d6]" />
                  <span className="font-bold">
                    {activeDay.fullFormatted || activeDay.date || activeDay.day}
                  </span>
                  {activeDay.active && (
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                      {isArabic ? 'اليوم' : 'Today'}
                    </span>
                  )}
                </div>
                <span className="font-extrabold text-[#0084d6] dark:text-sky-400 text-sm">
                  {isArabic ? `${activeDay.count} عميل تصفح متجرك` : `${activeDay.count} visitors`}
                </span>
              </div>
            )}
          </div>

          {/* Real Devices Distribution Breakdown */}
          <div className="bg-slate-50/70 dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-200/70 dark:border-slate-700 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">{isArabic ? '📱 منصات وأجهزة تصفح المتجر' : 'Visitor Browsing Platforms'}</h3>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/60">
                  D1 SQLite
                </span>
              </div>

              <div className="space-y-4">
                {/* Mobile Browsers */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-[#0084d6] dark:text-sky-400" />
                      {isArabic ? 'أجهزة الجوال المحمولة (Mobile)' : 'Mobile Browsers'}
                    </span>
                    <span className="font-mono text-[#0084d6] font-black">{mobilePercent}% ({mobileCount})</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-[#0084d6] h-2.5 rounded-full transition-all duration-700"
                      style={{ width: `${mobilePercent}%` }}
                    />
                  </div>
                </div>

                {/* Desktop */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Monitor className="w-3.5 h-3.5 text-[#0e1f38] dark:text-slate-400" />
                      {isArabic ? 'أجهزة الكمبيوتر (Desktop / Mac)' : 'Desktop / PC / Mac'}
                    </span>
                    <span className="font-mono text-[#0e1f38] dark:text-slate-300 font-black">{desktopPercent}% ({desktopCount})</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-[#0e1f38] dark:bg-slate-500 h-2.5 rounded-full transition-all duration-700"
                      style={{ width: `${desktopPercent}%` }}
                    />
                  </div>
                </div>

                {/* Tablets */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-[#00b4d8]" />
                      {isArabic ? 'الأجهزة اللوحية (Tablets / iPads)' : 'Tablets / iPads'}
                    </span>
                    <span className="font-mono text-[#00b4d8] font-black">{tabletPercent}% ({tabletCount})</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-[#00b4d8] h-2.5 rounded-full transition-all duration-700"
                      style={{ width: `${tabletPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200/60 dark:border-slate-700 mt-4 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span className="text-base">💡</span>
              <span>{isArabic ? `توضح هذه الإحصائية نوع الأجهزة والمنصات التي يستخدمها العملاء لتصفح معروضات وتشكيلة ${store?.name || 'متجرك'} في D1.` : 'Reflects the browsing platforms used by customers to explore your store items.'}</span>
            </div>
          </div>
        </div>

        {/* 4. REAL RECENT VISITS LOG (سجل الزيارات اللحظية الحقيقية) */}
        <div className="mt-8 bg-slate-50/70 dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-200/70 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0084d6]" />
                <span>{isArabic ? 'سجل أحدث الزيارات الفورية المخزنة في D1' : 'Recent D1 Visits Log'}</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {isArabic ? 'يتم التحديث لحظياً عند كل زيارة جديدة لمتجرك' : 'Instantly updated on each visit'}
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {isArabic ? `آخر تحديث: ${lastUpdated.toLocaleTimeString('ar-EG')}` : `Updated: ${lastUpdated.toLocaleTimeString()}`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400">
                  <th className="pb-2 text-start font-bold">{isArabic ? 'وقت الزيارة' : 'Timestamp'}</th>
                  <th className="pb-2 text-start font-bold">{isArabic ? 'الجهاز المستخدم' : 'Device'}</th>
                  <th className="pb-2 text-start font-bold">{isArabic ? 'مصدر الزيارة (Referrer)' : 'Referrer'}</th>
                  <th className="pb-2 text-start font-bold">{isArabic ? 'الصفحة' : 'Page'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700">
                {(stats?.recent || []).slice(0, 5).map((r, i) => (
                  <tr key={r.id || i} className="hover:bg-sky-50/50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="py-2.5 font-mono text-slate-600 dark:text-slate-300">{r.visited_at}</td>
                    <td className="py-2.5 font-medium text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      {r.device.includes('iPhone') || r.device.includes('Android') ? (
                        <Smartphone className="w-3.5 h-3.5 text-[#0084d6]" />
                      ) : r.device.includes('iPad') ? (
                        <Globe className="w-3.5 h-3.5 text-[#00b4d8]" />
                      ) : (
                        <Monitor className="w-3.5 h-3.5 text-[#0e1f38]" />
                      )}
                      <span>{r.device}</span>
                    </td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-300">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-[11px] font-bold">
                        {r.referrer || 'زيارة مباشرة'}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-slate-500">{r.page || '/store'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 5. QUICK ACTIONS & STORE PROFILE */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Store Profile summary */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between transition-colors">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">{isArabic ? 'ملف المتجر الحقيقي' : 'Live Store Profile'}</span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{store?.name || t('daidar_solutions')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 leading-relaxed">
              {store?.bio || (store?.activity_type ? `متجر متخصص في ${store.activity_type} مع تجربة تسوق مباشرة وطلب فوري عبر واتساب.` : 'متجر إلكتروني متكامل مع تجربة تسوق مباشرة وطلب فوري عبر واتساب.')}
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                {store?.activity_type}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-[#e6f4fe] dark:bg-sky-950/60 text-[#0084d6] dark:text-sky-400 font-medium border border-sky-100 dark:border-sky-800">
                {t('currency_label')} {store?.currency || 'ج.م'}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800 font-mono">
                واتساب: {store?.whatsapp_number}
              </span>
            </div>
          </div>

          <div className="pt-5 border-t border-slate-100 dark:border-slate-800 mt-6 flex items-center justify-between">
            <button
              onClick={onNavigateToStore}
              className="text-xs font-bold text-[#0084d6] dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{isArabic ? 'معاينة واجهة المتجر الحية' : 'Live Storefront Preview'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Product Setup */}
        <div className="bg-[#0e1f38] dark:bg-slate-900 text-white rounded-3xl p-6 shadow-lg shadow-slate-900/15 border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-[#00b4d8] uppercase tracking-wider block mb-2">{isArabic ? 'إدارة المنتجات والمخزون' : 'Products & Stock'}</span>
            <h3 className="text-lg font-bold">{isArabic ? (store?.activity_type ? `إدارة معروضات وتشكيلة ${store.activity_type}` : 'إضافة منتجاتك وتحديث أسعارها') : 'Add Products & Set Prices'}</h3>
            <p className="text-xs text-slate-300 dark:text-slate-400 mt-1 leading-relaxed">
              {isArabic ? `أضف سلعك وتشكيلة ${store?.activity_type || 'المنتجات'} بصور عالية الجودة وحدد أسعارها لتظهر فوراً في واجهة العرض للزبائن مع مسار الشراء المباشر.` : 'Add items with high-res images and prices for seamless WhatsApp checkout.'}
            </p>
          </div>

          <div className="pt-6 flex items-center justify-between">
            <button
              onClick={onNavigateToProducts}
              className="px-4 py-2.5 bg-[#0084d6] hover:bg-[#0074bd] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              {isArabic ? 'إدارة المنتجات والأسعار الآن ←' : 'Manage Products Now →'}
            </button>
            <span className="text-xs font-mono text-slate-400">
              {stats?.productsSummary?.total_products || 0} {isArabic ? 'منتج مسجل' : 'items'}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
