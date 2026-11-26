import Link from 'next/link'
import { ArrowLeft, ArrowRight, Blocks } from 'lucide-react'
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

          {/* ── Rotating Services Showcase ────────── */}
          <HeroServicesCarousel locale={locale} />

        </div>
      </div>
    </section>
  )
}
