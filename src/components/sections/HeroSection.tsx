import Link from 'next/link'
import { ArrowLeft, ArrowRight, Blocks } from 'lucide-react'
import { getTranslations } from '@/locales'
import type { Locale } from '@/types'

interface HeroSectionProps {
  locale: Locale
}

export function HeroSection({ locale }: HeroSectionProps) {
  const t = getTranslations(locale)
  const isRTL = locale === 'ar'
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center overflow-hidden bg-[#f1f4f8] dark:bg-[#0b1628]"
      aria-label={locale === 'ar' ? 'القسم الافتتاحي' : 'Hero section'}
    >
      {/* Subtle background accent */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 inset-x-0 h-[480px] bg-gradient-to-b from-[#e2eaf4]/60 to-transparent dark:from-[#0d1e38] dark:to-transparent opacity-60" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-28 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* ── Text Content ─────────────────────── */}
          <div className={`space-y-8 ${isRTL ? 'text-right' : 'text-left'}`}>

            {/* Label */}
            <div className="animate-fade-in-up">
              <span className="section-label">
                {t.hero.badge}
              </span>
            </div>

            {/* Heading */}
            <div className="animate-fade-in-up delay-100">
              <h1 className="text-4xl sm:text-5xl font-bold leading-tight text-[#122840] dark:text-[#e8f0fb] text-balance">
                {locale === 'ar' ? (
                  <>
                    شريكك التقني{' '}
                    <span className="text-[#0284c7] dark:text-[#38bdf8]">لتطوير شغلك</span>
                  </>
                ) : (
                  <>
                    Your Technical Partner{' '}
                    <span className="text-[#0284c7] dark:text-[#38bdf8]">for Business Growth</span>
                  </>
                )}
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-[#4a6080] dark:text-[#94b4d4] leading-relaxed max-w-md animate-fade-in-up delay-200">
              {locale === 'ar'
                ? 'نطوّر مواقع ومتاجر وأنظمة مخصصة تساعدك تنظّم شغلك وتوسّع نشاطك.'
                : 'We build websites, stores, and custom systems that help you organize your business and expand your reach.'}
            </p>

            {/* CTA Buttons */}
            <div
              className={`flex flex-wrap gap-3 animate-fade-in-up delay-300 ${
                isRTL ? 'justify-start' : 'justify-start'
              }`}
            >
              <Link
                href={`/${locale}/request`}
                className="btn-primary"
                id="hero-request-btn"
              >
                {locale === 'ar' ? 'اطلب مشروعك' : 'Request Your Project'}
                <ArrowIcon size={16} />
              </Link>
              <Link
                href={`/${locale}/hub`}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0c3156] px-5 py-3 font-bold text-white shadow-lg shadow-blue-950/15 transition hover:bg-[#164776]"
                id="hero-hub-btn"
              >
                <Blocks size={18} />
                {locale === 'ar' ? 'استكشف دعيدر هب' : 'Explore Daidar Hub'}
              </Link>
            </div>

            {/* Trust row */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 animate-fade-in-up delay-400">
              {(locale === 'ar'
                ? ['مواقع احترافية', 'أنظمة مخصصة', 'دعم مستمر']
                : ['Professional Sites', 'Custom Systems', 'Ongoing Support']
              ).map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-1.5 text-sm text-[#4a6080] dark:text-[#94b4d4] font-medium"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] flex-shrink-0" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* ── Dashboard Mock Visual ─────────────── */}
          <div className="relative flex items-center justify-center animate-fade-in-up delay-200">
            <div className="relative w-full max-w-lg mx-auto">

              {/* Subtle glow behind card */}
              <div
                className="absolute inset-0 rounded-2xl opacity-15 dark:opacity-30 blur-3xl pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 50% 50%, #0284c7 0%, transparent 70%)' }}
                aria-hidden="true"
              />

              {/* Dashboard card */}
              <div className="dashboard-mock relative overflow-hidden">

                {/* Top bar */}
                <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3.5 border-b border-[#e2e8f0] dark:border-[#1e3456]">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#f87171]" />
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#fbbf24]" />
                    <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#34d399]" />
                  </div>
                  <div className="flex-1 mx-2 sm:mx-4">
                    <div className="bg-[#f1f5f9] dark:bg-[#1a2d48] rounded-md h-5 sm:h-6 px-2 sm:px-3 flex items-center">
                      <span className="text-[10px] sm:text-xs text-[#8fa3bb] font-mono truncate">
                        {locale === 'ar' ? 'لوحة الإدارة — دعيدر' : 'admin.daidar.io'}
                      </span>
                    </div>
                  </div>
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#38bdf8]/20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#38bdf8]" />
                  </div>
                </div>

                {/* Sidebar + Content */}
                <div className="flex" style={{ minHeight: '280px' }}>

                  {/* Sidebar */}
                  <div className="w-11 sm:w-[72px] bg-[#f8fafc] dark:bg-[#0f1d33] border-e border-[#e2e8f0] dark:border-[#1e3456] flex flex-col items-center gap-2 sm:gap-3 py-3 sm:py-4 flex-shrink-0">
                    {/* Logo area */}
                    <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#38bdf8]/15 flex items-center justify-center mb-1 sm:mb-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="sm:w-5 sm:h-5">
                        <rect x="3" y="3" width="8" height="8" rx="2" fill="#38bdf8"/>
                        <rect x="13" y="3" width="8" height="8" rx="2" fill="#0f2744" fillOpacity="0.3"/>
                        <rect x="3" y="13" width="8" height="8" rx="2" fill="#0f2744" fillOpacity="0.3"/>
                        <rect x="13" y="13" width="8" height="8" rx="2" fill="#38bdf8" fillOpacity="0.5"/>
                      </svg>
                    </div>
                    {[
                      <svg key="home" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="sm:w-4 sm:h-4"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                      <svg key="chart" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="sm:w-4 sm:h-4"><path d="M18 20V10M12 20V4M6 20v-6" stroke="#8fa3bb" strokeWidth="2" strokeLinecap="round"/></svg>,
                      <svg key="users" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="sm:w-4 sm:h-4"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" stroke="#8fa3bb" strokeWidth="2" strokeLinecap="round"/></svg>,
                      <svg key="settings" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="sm:w-4 sm:h-4"><circle cx="12" cy="12" r="3" stroke="#8fa3bb" strokeWidth="2"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke="#8fa3bb" strokeWidth="2"/></svg>,
                    ].map((icon, i) => (
                      <div
                        key={i}
                        className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors ${
                          i === 0
                            ? 'bg-[#38bdf8]/15'
                            : 'hover:bg-[#f1f5f9] dark:hover:bg-[#1a2d48]'
                        }`}
                      >
                        {icon}
                      </div>
                    ))}
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0 p-3 sm:p-5 overflow-hidden">
                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-5">
                      {[
                        { label: locale === 'ar' ? 'المبيعات' : 'Sales', val: '٢,٤٨٠', color: '#38bdf8' },
                        { label: locale === 'ar' ? 'الطلبات' : 'Orders', val: '١٢٨', color: '#34d399' },
                        { label: locale === 'ar' ? 'العملاء' : 'Clients', val: '٤٧', color: '#a78bfa' },
                      ].map(({ label, val, color }) => (
                        <div
                          key={label}
                          className="bg-[#f8fafc] dark:bg-[#0f1d33] rounded-lg sm:rounded-xl p-2 sm:p-3 border border-[#e2e8f0] dark:border-[#1e3456] min-w-0"
                        >
                          <div className="text-[9px] sm:text-[10px] text-[#8fa3bb] mb-0.5 sm:mb-1 truncate">{label}</div>
                          <div className="text-xs sm:text-base font-bold truncate" style={{ color }}>{val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Chart area */}
                    <div className="bg-[#f8fafc] dark:bg-[#0f1d33] rounded-lg sm:rounded-xl p-2.5 sm:p-3 mb-3 sm:mb-4 border border-[#e2e8f0] dark:border-[#1e3456]">
                      <div className="text-[9px] sm:text-[10px] text-[#8fa3bb] mb-2 sm:mb-3">{locale === 'ar' ? 'الأداء الشهري' : 'Monthly Performance'}</div>
                      {/* Mini bar chart */}
                      <div className="flex items-end gap-1 sm:gap-1.5 h-12 sm:h-16">
                        {[40, 65, 45, 80, 60, 90, 70, 85, 55, 95, 75, 88].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-sm transition-all"
                            style={{
                              height: `${h}%`,
                              background: i === 10 || i === 11
                                ? '#38bdf8'
                                : `rgba(56,189,248,${0.2 + (h / 100) * 0.3})`,
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Recent items */}
                    <div className="space-y-1.5 sm:space-y-2">
                      {[
                        { name: locale === 'ar' ? 'متجر الرياض' : 'Riyadh Store', status: locale === 'ar' ? 'مكتمل' : 'Done', color: '#34d399' },
                        { name: locale === 'ar' ? 'نظام المخزون' : 'Inventory System', status: locale === 'ar' ? 'جاري' : 'Active', color: '#38bdf8' },
                        { name: locale === 'ar' ? 'موقع العيادة' : 'Clinic Website', status: locale === 'ar' ? 'قيد المراجعة' : 'Review', color: '#fbbf24' },
                      ].map(({ name, status, color }) => (
                        <div
                          key={name}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                            <span className="text-[10px] sm:text-[11px] text-[#4a6080] dark:text-[#94b4d4] truncate">{name}</span>
                          </div>
                          <span
                            className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full flex-shrink-0 font-medium"
                            style={{ background: `${color}18`, color }}
                          >
                            {status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
