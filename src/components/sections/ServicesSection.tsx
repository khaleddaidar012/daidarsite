'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Globe,
  ShoppingBag,
  Settings2,
  Cloud,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  RotateCcw,
  Compass,
  Code2,
  Rocket,
} from 'lucide-react'
import { getTranslations } from '@/locales'
import type { Locale } from '@/types'
import clsx from 'clsx'

interface ServicesSectionProps {
  locale: Locale
}

const iconMap: Record<string, React.ElementType> = {
  Globe,
  ShoppingBag,
  Settings2,
  Cloud,
}

const serviceVisualMap: Record<string, string> = {
  website: '/images/hero-services/website.jpg',
  ecommerce: '/images/hero-services/ecommerce.jpg',
  system: '/images/hero-services/business-system.jpg',
  saas: '/images/hero-services/saas.svg',
}

const accentMap: Record<
  string,
  { bg: string; icon: string; border: string; ring: string }
> = {
  website: {
    bg: '#e6f4fe',
    icon: '#0284c7',
    border: '#bae6fd',
    ring: 'from-[#0284c7] to-[#38bdf8]',
  },
  ecommerce: {
    bg: '#f3e8ff',
    icon: '#7c3aed',
    border: '#ddd6fe',
    ring: 'from-[#7c3aed] to-[#a855f7]',
  },
  system: {
    bg: '#ffedd5',
    icon: '#ea580c',
    border: '#fed7aa',
    ring: 'from-[#ea580c] to-[#f97316]',
  },
  saas: {
    bg: '#dcfce7',
    icon: '#059669',
    border: '#bbf7d0',
    ring: 'from-[#059669] to-[#10b981]',
  },
}

function ServiceCard({
  service,
  locale,
  isRTL,
}: {
  service: (typeof import('@/locales/ar').default.services.items)[number]
  locale: Locale
  isRTL: boolean
}) {
  const [isFlipped, setIsFlipped] = useState(false)
  const Icon = iconMap[service.icon] || Globe
  const accent = accentMap[service.id] || accentMap.website
  const coverImage = serviceVisualMap[service.id] || serviceVisualMap.website
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight
  const t = getTranslations(locale)

  const handleMouseEnter = () => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ) {
      setIsFlipped(true)
    }
  }

  const handleMouseLeave = () => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ) {
      setIsFlipped(false)
    }
  }

  return (
    <div
      className={clsx(
        'flip-card group h-[430px] w-full cursor-pointer',
        isFlipped && 'is-flipped'
      )}
      onClick={() => {
        if (!isFlipped) setIsFlipped(true)
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={() => setIsFlipped(true)}
      onBlur={() => setIsFlipped(false)}
    >
      <div className={clsx('flip-card-inner h-full', isFlipped && 'is-flipped')}>
        {/* Front Side */}
        <div
          className="flip-card-front rounded-2xl overflow-hidden flex flex-col justify-between
                     bg-white dark:bg-[#132038]
                     border border-[#dde6f0] dark:border-[#1e3456]
                     shadow-[0_4px_20px_rgba(15,39,68,0.06)]
                     hover:shadow-[0_12px_32px_rgba(2,132,199,0.14)]
                     transition-shadow duration-300"
        >
          {/* Visual Cover Header */}
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#eaf3fb] dark:bg-[#0b1628] border-b border-[#e5edf5] dark:border-[#1e3456]">
            <img
              src={coverImage}
              alt={service.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
            <div
              className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent.ring}`}
              aria-hidden="true"
            />
            <div
              className="absolute bottom-2.5 start-3 w-10 h-10 rounded-xl flex items-center justify-center shadow-md backdrop-blur-md"
              style={{
                backgroundColor: accent.bg,
                border: `1px solid ${accent.border}`,
              }}
              aria-hidden="true"
            >
              <Icon size={19} color={accent.icon} />
            </div>
          </div>

          {/* Card Body */}
          <div className="p-5 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-[#0f2744] dark:text-[#e8f0fb] mb-1.5">
                {service.title}
              </h3>
              <p className="text-xs sm:text-[13px] text-[#4a6080] dark:text-[#94b4d4] leading-relaxed line-clamp-2">
                {service.frontDesc}
              </p>

              {/* Quick Preview Highlights on Front */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {service.benefits.slice(0, 2).map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#f4f8fc] dark:bg-[#0f1d33] border border-[#e2ebf4] dark:border-[#1e3456] px-2.5 py-1 text-[11px] font-semibold text-[#1e3a5f] dark:text-[#b8d0e8]"
                  >
                    <CheckCircle size={11} className="text-[#0284c7] dark:text-[#38bdf8] flex-shrink-0" />
                    <span className="truncate max-w-[170px]">{item}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Flip Hint Footer */}
            <div className="pt-3 mt-3 border-t border-[#eef3f8] dark:border-[#1a2d48] flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-bold text-[#0284c7] dark:text-[#38bdf8]">
                <RefreshCw size={13} className="animate-spin-slow" />
                {t.services.flipHint}
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#e6f4fe] dark:bg-[#38bdf8]/15 text-[#0284c7] dark:text-[#38bdf8] font-bold">
                {locale === 'ar' ? 'تفاصيل' : 'Details'}
              </span>
            </div>
          </div>
        </div>

        {/* Back Side */}
        <div
          className="flip-card-back rounded-2xl p-6 flex flex-col justify-between
                     bg-gradient-to-b from-white to-[#f6fafe] dark:from-[#12223c] dark:to-[#0d192d]
                     border-2 border-[#0284c7]/30 dark:border-[#38bdf8]/50
                     shadow-[0_10px_28px_rgba(2,132,199,0.14)] cursor-default"
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          <div className="overflow-hidden flex-1 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <h3 className="text-base font-extrabold text-[#0f2744] dark:text-[#e8f0fb]">
                {service.whyTitle}
              </h3>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsFlipped(false)
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-[#0284c7] dark:text-[#38bdf8] bg-[#e6f4fe] dark:bg-[#38bdf8]/15 hover:bg-[#bae6fd]/60 active:scale-95 px-2.5 py-1 rounded-full transition-all flex-shrink-0 cursor-pointer"
                aria-label={locale === 'ar' ? 'العودة' : 'Back'}
              >
                <RotateCcw size={12} />
                <span>{locale === 'ar' ? 'عودة' : 'Back'}</span>
              </button>
            </div>

            <p className="text-xs text-[#475a72] dark:text-[#94b4d4] mb-4 leading-relaxed">
              {service.whyDesc}
            </p>

            {/* Full Benefits List */}
            <ul className="space-y-2 flex-1">
              {service.benefits.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-2 text-xs font-semibold text-[#122840] dark:text-[#dbe9f8]"
                >
                  <CheckCircle
                    size={15}
                    className="text-[#0284c7] dark:text-[#38bdf8] flex-shrink-0 mt-0.5"
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Link & Back Button */}
          <div className="mt-4 pt-3 border-t border-[#e2ebf4] dark:border-[#1e3456] flex items-center gap-2">
            <Link
              href={`/${locale}/request?service=${service.id}`}
              className="btn-primary text-xs py-2.5 px-4 justify-center flex-1 font-bold"
              tabIndex={isFlipped ? 0 : -1}
              id={`service-flip-cta-${service.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              {t.services.requestService}
              <ArrowIcon size={14} />
            </Link>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsFlipped(false)
              }}
              className="py-2.5 px-3 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#132038] text-[#64748b] dark:text-[#94a3b8] hover:text-[#0284c7] dark:hover:text-[#38bdf8] hover:border-[#0284c7]/40 text-xs font-medium transition-colors flex items-center justify-center shrink-0 active:scale-95 cursor-pointer"
              aria-label={locale === 'ar' ? 'العودة' : 'Back'}
              title={locale === 'ar' ? 'العودة' : 'Back'}
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ServicesSection({ locale }: ServicesSectionProps) {
  const t = getTranslations(locale)
  const isRTL = locale === 'ar'

  const workflowSteps =
    locale === 'ar'
      ? [
          {
            num: '01',
            icon: Compass,
            title: 'فهم نشاطك وأهدافك',
            desc: 'نسمع تفاصيل شغلك ونحدد المتطلبات بدقة قبل البدء في أي تطوير.',
          },
          {
            num: '02',
            icon: Code2,
            title: 'التصميم والتطوير العملي',
            desc: 'نبني واجهات منظمة وأنظمة سريعة مناسبة لطريقة عملك اليومية.',
          },
          {
            num: '03',
            icon: Rocket,
            title: 'الإطلاق والمتابعة',
            desc: 'نسلّم المشروع جاهزًا للتشغيل مع متابعة ودعم تقني كشركاء نجاح.',
          },
        ]
      : [
          {
            num: '01',
            icon: Compass,
            title: 'Understand Your Business',
            desc: 'We study your workflow and define clear requirements before building.',
          },
          {
            num: '02',
            icon: Code2,
            title: 'Practical Design & Build',
            desc: 'We craft fast, structured interfaces and systems fitted to your daily work.',
          },
          {
            num: '03',
            icon: Rocket,
            title: 'Launch & Ongoing Support',
            desc: 'We deliver ready-to-run software with reliable follow-up as partners in success.',
          },
        ]

  return (
    <section
      id="services"
      className="relative py-20 lg:py-24 bg-gradient-to-b from-[#f0f6fc] via-[#f6fafe] to-[#f1f6fb] dark:from-[#091323] dark:via-[#0b1628] dark:to-[#091323] border-b border-[#e2ebf4] dark:border-[#1a2c48] overflow-hidden"
      aria-labelledby="services-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className={`max-w-2xl mb-12 ${isRTL ? 'text-right' : 'text-left'}`}>
          <span className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-[#102542] border border-[#bae6fd]/80 dark:border-[#1e3a5f] px-3.5 py-1 text-xs font-bold text-[#0284c7] dark:text-[#38bdf8] mb-4 shadow-sm">
            {t.services.sectionLabel}
          </span>
          <h2
            id="services-heading"
            className="text-3xl sm:text-4xl font-extrabold text-[#0f2744] dark:text-[#e8f0fb] leading-snug mb-3"
          >
            {t.services.title}
          </h2>
          <p className="text-base text-[#4a6080] dark:text-[#94b4d4] leading-relaxed">
            {t.services.subtitle}
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {t.services.items.map((service, i) => (
            <div
              key={service.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <ServiceCard
                service={service}
                locale={locale}
                isRTL={isRTL}
              />
            </div>
          ))}
        </div>

        {/* 3-Step Working Process Strip */}
        <div className="mt-14 rounded-3xl border border-[#d9e6f3] dark:border-[#1e3456] bg-white/90 dark:bg-[#112038]/90 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <span className="text-xs font-bold text-[#0284c7] dark:text-[#38bdf8]">
                {locale === 'ar' ? 'منهجية العمل' : 'Our Process'}
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#0f2744] dark:text-[#e8f0fb] mt-1">
                {locale === 'ar' ? 'كيف نحوّل فكرتك إلى نظام جاهز؟' : 'How We Turn Your Idea Into a Ready Solution'}
              </h3>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
            {workflowSteps.map(({ num, icon: StepIcon, title, desc }) => (
              <div
                key={num}
                className="rounded-2xl border border-[#e5edf6] dark:border-[#1e3456] bg-[#f8fbfe] dark:bg-[#0d192d] p-5 flex items-start gap-4"
              >
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <span className="w-11 h-11 rounded-xl bg-[#0c3156] dark:bg-[#16365e] text-[#7dd3fc] flex items-center justify-center shadow-sm">
                    <StepIcon size={20} />
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#0284c7] dark:text-[#38bdf8]">
                    {num}
                  </span>
                </div>
                <div className="min-w-0">
                  <h4 className="font-extrabold text-sm sm:text-base text-[#0f2744] dark:text-[#e8f0fb]">
                    {title}
                  </h4>
                  <p className="text-xs sm:text-[13px] text-[#4a6080] dark:text-[#94b4d4] mt-1.5 leading-6">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
