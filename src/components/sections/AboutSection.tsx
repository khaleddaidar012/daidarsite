import { CheckCircle2, Code2, Globe, Layers, ShoppingBag, Sparkles, Zap } from 'lucide-react'
import { getTranslations } from '@/locales'
import type { Locale } from '@/types'

interface AboutSectionProps {
  locale: Locale
}

const domainIcons = {
  websites: Globe,
  stores: ShoppingBag,
  systems: Layers,
} as const

export function AboutSection({ locale }: AboutSectionProps) {
  const t = getTranslations(locale)
  const isRTL = locale === 'ar'
  const valueIcons = [CheckCircle2, Zap, Code2]

  return (
    <section
      id="about"
      className="relative py-20 lg:py-24 bg-white dark:bg-[#0d192d] border-b border-[#e2ebf4] dark:border-[#1a2c48] overflow-hidden"
      aria-labelledby="about-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">

          {/* Company Story & Values Side */}
          <div className={`lg:col-span-6 space-y-6 ${isRTL ? 'lg:order-1 text-right' : 'lg:order-2 text-left'}`}>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#e6f4fe] dark:bg-[#102542] border border-[#bae6fd]/80 dark:border-[#1e3a5f] px-3.5 py-1 text-xs font-bold text-[#0284c7] dark:text-[#38bdf8] mb-4">
                {t.about.sectionLabel}
              </span>
              <h2
                id="about-heading"
                className="text-3xl sm:text-4xl font-extrabold text-[#0f2744] dark:text-[#e8f0fb] leading-snug"
              >
                {t.about.title}{' '}
                <span className="text-[#0284c7] dark:text-[#38bdf8]">
                  — {t.about.titleHighlight}
                </span>
              </h2>
            </div>

            <div className="space-y-4 text-[#425874] dark:text-[#9cb8d6] leading-8">
              <p className="text-base sm:text-[17px] font-medium text-[#1e3452] dark:text-[#d7e6f7]">
                {t.about.paragraph1}
              </p>
              <p className="text-sm sm:text-[15px]">{t.about.paragraph2}</p>
            </div>

            {/* Company Core Values */}
            <div className="grid sm:grid-cols-3 gap-3 pt-2">
              {t.about.values.map((value, i) => {
                const Icon = valueIcons[i] ?? CheckCircle2
                return (
                  <div
                    key={value.title}
                    className="rounded-2xl border border-[#e2ebf4] dark:border-[#1e3456] bg-[#f7fafd] dark:bg-[#12223c] p-4 shadow-sm hover:border-[#7dd3fc] dark:hover:border-[#38bdf8]/50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#e6f4fe] dark:bg-[#0f2744] text-[#0284c7] dark:text-[#38bdf8] flex items-center justify-center mb-3">
                      <Icon size={18} />
                    </div>
                    <h3 className="font-bold text-[#0f2744] dark:text-[#e8f0fb] text-sm mb-1">
                      {value.title}
                    </h3>
                    <p className="text-xs text-[#4a6080] dark:text-[#94b4d4] leading-6">
                      {value.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Institutional Daidar Brand Card Side */}
          <div className={`lg:col-span-6 ${isRTL ? 'lg:order-2' : 'lg:order-1'}`}>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b1d36] via-[#0f2b4c] to-[#0a3c68] text-white p-6 sm:p-8 shadow-[0_20px_50px_rgba(11,29,54,0.22)] border border-[#1d416d]">
              {/* Subtle geometric glow & grid */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.14]"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(125,211,252,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(125,211,252,0.25) 1px, transparent 1px)',
                  backgroundSize: '32px 32px',
                }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-20 end-0 h-56 w-56 rounded-full bg-[#38bdf8]/25 blur-3xl"
              />

              <div className="relative z-10 space-y-6">
                {/* Brand Header with Real Daidar Logo + Established 2026 */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md p-2.5 flex items-center justify-center flex-shrink-0 shadow-inner">
                      <img
                        src="/logo-light.png"
                        alt={t.about.companyAlt}
                        width={44}
                        height={44}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-lg sm:text-xl font-extrabold text-white leading-tight truncate">
                        {t.about.companyName}
                      </div>
                      <div className="text-xs font-semibold text-sky-200/85 mt-1">
                        {t.about.foundedLabel}
                      </div>
                    </div>
                  </div>

                  {/* Highlighted Slogan Badge */}
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-[#38bdf8]/20 border border-[#7dd3fc]/40 px-4 py-2 backdrop-blur-sm">
                    <Sparkles size={15} className="text-[#7dd3fc] flex-shrink-0" aria-hidden="true" />
                    <div className="leading-tight">
                      <span className="block text-[10px] font-semibold text-sky-200/80">
                        {t.about.sloganLabel}
                      </span>
                      <strong className="text-sm font-extrabold text-white">
                        «{t.about.slogan}»
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-white/15" />

                {/* 3 Core Domains */}
                <div className="space-y-3">
                  <div className="text-xs font-bold text-sky-200/90 tracking-wide">
                    {t.about.domainsLabel}
                  </div>
                  <div className="grid gap-3">
                    {t.about.domains.map((domain) => {
                      const DomainIcon =
                        domainIcons[domain.id as keyof typeof domainIcons] ?? Globe
                      return (
                        <div
                          key={domain.id}
                          className="flex items-start gap-3.5 rounded-2xl bg-white/[0.08] border border-white/12 p-3.5 backdrop-blur-sm hover:bg-white/[0.12] transition-colors"
                        >
                          <div className="w-10 h-10 rounded-xl bg-[#38bdf8]/20 border border-[#7dd3fc]/30 text-[#7dd3fc] flex items-center justify-center flex-shrink-0">
                            <DomainIcon size={19} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-white">
                              {domain.title}
                            </div>
                            <p className="text-xs text-sky-100/80 mt-0.5 leading-relaxed">
                              {domain.desc}
                            </p>
                          </div>
                        </div>
                      )
                    })}
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
