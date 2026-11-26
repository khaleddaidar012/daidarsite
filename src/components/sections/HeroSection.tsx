import Link from 'next/link'
import { ArrowLeft, ArrowRight, Blocks, Globe, Layers, ShieldCheck } from 'lucide-react'
import { getTranslations } from '@/locales'
import type { Locale } from '@/types'
import { HeroServicesCarousel } from './HeroServicesCarousel'

interface HeroSectionProps {
  locale: Locale
}

export function HeroSection({ locale }: HeroSectionProps) {
  const t = getTranslations(locale)
  const isRTL = locale === 'ar'
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight

  const trustPillars =
    locale === 'ar'
      ? [
          { icon: Globe, label: 'مواقع احترافية' },
          { icon: Layers, label: 'أنظمة مخصصة' },
          { icon: ShieldCheck, label: 'دعم مستمر' },
        ]
      : [
          { icon: Globe, label: 'Professional Sites' },
          { icon: Layers, label: 'Custom Systems' },
          { icon: ShieldCheck, label: 'Ongoing Support' },
        ]

  return (
    <section
      id="hero"
      className="relative min-h-[86vh] flex items-center overflow-hidden bg-[#f7fafd] dark:bg-[#0b1628] border-b border-[#e2ebf4] dark:border-[#1a2c48]"
      aria-label={locale === 'ar' ? 'القسم الافتتاحي' : 'Hero section'}
    >
      {/* Clean uniform subtle architectural dot grid — no blotchy color spills */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-[0.14]"
          style={{
            backgroundImage: 'radial-gradient(#9fb6cf 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 lg:py-28 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* ── Text Content ─────────────────────── */}
          <div className={`space-y-7 ${isRTL ? 'text-right' : 'text-left'}`}>

            {/* Brand Eyebrow Pill */}
            <div className="animate-fade-in-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#bae6fd] dark:border-[#1e3a5f] bg-white/90 dark:bg-[#10203a]/90 px-4 py-1.5 text-xs font-bold text-[#0284c7] dark:text-[#38bdf8] shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#0284c7] dark:bg-[#38bdf8]" aria-hidden="true" />
                {t.hero.badge}
              </span>
            </div>

            {/* Heading */}
            <div className="animate-fade-in-up delay-100">
              <h1 className="text-4xl sm:text-5xl lg:text-[3.35rem] font-extrabold leading-[1.2] text-[#0f2744] dark:text-[#e8f0fb] text-balance">
                {locale === 'ar' ? (
                  <>
                    شريكك التقني{' '}
                    <span className="bg-gradient-to-l from-[#0284c7] to-[#0ea5e9] dark:from-[#38bdf8] dark:to-[#7dd3fc] bg-clip-text text-transparent">
                      لتطوير شغلك
                    </span>
                  </>
                ) : (
                  <>
                    Your Technical Partner{' '}
                    <span className="bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] dark:from-[#38bdf8] dark:to-[#7dd3fc] bg-clip-text text-transparent">
                      for Business Growth
                    </span>
                  </>
                )}
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-[#425874] dark:text-[#9cb8d6] leading-relaxed max-w-lg animate-fade-in-up delay-200 font-medium">
              {locale === 'ar'
                ? 'نطوّر مواقع ومتاجر وأنظمة مخصصة تساعدك تنظّم شغلك وتوسّع نشاطك.'
                : 'We build websites, stores, and custom systems that help you organize your business and expand your reach.'}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-3.5 animate-fade-in-up delay-300 justify-start">
              <Link
                href={`/${locale}/request`}
                className="btn-primary px-7 py-3.5 text-sm font-bold shadow-[0_6px_20px_rgba(2,132,199,0.28)]"
                id="hero-request-btn"
              >
                {locale === 'ar' ? 'اطلب مشروعك' : 'Request Your Project'}
                <ArrowIcon size={16} />
              </Link>
              <Link
                href={`/${locale}/hub`}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0c3156] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-950/20 transition hover:bg-[#164776] active:scale-[0.98]"
                id="hero-hub-btn"
              >
                <Blocks size={18} />
                {locale === 'ar' ? 'استكشف دعيدر هب' : 'Explore Daidar Hub'}
              </Link>
            </div>

            {/* Structured Trust Pillars */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 pt-2 max-w-lg animate-fade-in-up delay-400">
              {trustPillars.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-xl border border-[#d9e5f2] dark:border-[#1e3456] bg-white/85 dark:bg-[#112038]/85 px-3 py-2.5 shadow-sm backdrop-blur-sm"
                >
                  <span
                    className="w-7 h-7 rounded-lg bg-[#e6f4fe] dark:bg-[#0f2744] text-[#0284c7] dark:text-[#38bdf8] flex items-center justify-center flex-shrink-0"
                    aria-hidden="true"
                  >
                    <Icon size={14} />
                  </span>
                  <span className="text-xs sm:text-[13px] font-bold text-[#122840] dark:text-[#e2eefb] truncate">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Rotating Services Showcase ────────── */}
          <HeroServicesCarousel locale={locale} />

        </div>

        {/* Clean Bottom Services Quick-Jump Ribbon (grounds the hero visually) */}
        <div className="mt-14 pt-7 border-t border-[#dde7f2] dark:border-[#1a2c48] grid grid-cols-2 lg:grid-cols-4 gap-3">
          {t.hero.carousel.slides.map((slide, idx) => (
            <Link
              key={slide.id}
              href={`/${locale}#services`}
              className="group flex items-center justify-between gap-2 rounded-2xl border border-[#dde7f2] dark:border-[#1e3456] bg-white/90 dark:bg-[#102038]/90 px-4 py-3 hover:border-[#0284c7] dark:hover:border-[#38bdf8] hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[11px] font-mono font-extrabold text-[#0284c7] dark:text-[#38bdf8] bg-[#e6f4fe] dark:bg-[#0f2744] px-2 py-0.5 rounded-md flex-shrink-0">
                  0{idx + 1}
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-[#0f2744] dark:text-[#e8f0fb] truncate">
                  {slide.title}
                </span>
              </div>
              <ArrowIcon
                size={14}
                className="text-[#8fa3bb] group-hover:text-[#0284c7] dark:group-hover:text-[#38bdf8] transition-colors flex-shrink-0"
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
