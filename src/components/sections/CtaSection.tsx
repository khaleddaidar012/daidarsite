import Link from 'next/link'
import { ArrowLeft, ArrowRight, MessageCircle, Sparkles } from 'lucide-react'
import { getTranslations } from '@/locales'
import type { Locale } from '@/types'

interface CtaSectionProps {
  locale: Locale
}

export function CtaSection({ locale }: CtaSectionProps) {
  const t = getTranslations(locale)
  const isRTL = locale === 'ar'
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight

  return (
    <section
      id="contact"
      className="py-16 lg:py-24 bg-gradient-to-b from-[#f1f6fb] to-[#e9f2fa] dark:from-[#091323] dark:to-[#070f1d]"
      aria-labelledby="cta-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#08192f] via-[#0f2b4c] to-[#0a4478] text-white p-8 sm:p-12 lg:p-16 text-center shadow-[0_24px_60px_rgba(8,25,47,0.28)] border border-[#1d4470]">
          {/* Architectural Grid + Ambient Glows */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div
              className="absolute inset-0 opacity-[0.14]"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(125,211,252,0.28) 1px, transparent 1px), linear-gradient(to bottom, rgba(125,211,252,0.28) 1px, transparent 1px)',
                backgroundSize: '34px 34px',
              }}
            />
            <div className="absolute -top-24 start-1/4 h-64 w-64 rounded-full bg-[#38bdf8]/25 blur-3xl" />
            <div className="absolute -bottom-24 end-1/4 h-64 w-64 rounded-full bg-[#0284c7]/30 blur-3xl" />
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#7dd3fc]/60 to-transparent" />
          </div>

          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs font-bold text-sky-200 mb-5 backdrop-blur-sm">
              <Sparkles size={14} className="text-[#7dd3fc]" aria-hidden="true" />
              <span>{t.about.companyName} · «{t.about.slogan}»</span>
            </span>

            <h2
              id="cta-heading"
              className="text-3xl sm:text-4xl lg:text-[2.6rem] font-extrabold mb-4 leading-tight text-white text-balance"
            >
              {t.cta.title}
            </h2>
            <p className="text-base sm:text-lg text-sky-100/85 mb-9 leading-relaxed max-w-xl mx-auto">
              {t.cta.subtitle}
            </p>

            <div className="flex flex-wrap justify-center gap-3.5">
              <Link
                href={`/${locale}/request`}
                id="cta-request-btn"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#38bdf8] hover:bg-[#0ea5e9] text-[#08192f] font-extrabold text-sm rounded-xl transition-all duration-200 active:scale-[0.98] shadow-[0_8px_24px_rgba(56,189,248,0.4)]"
              >
                {t.cta.requestProject}
                <ArrowIcon size={16} />
              </Link>
              <a
                href="https://wa.me/201061532875"
                target="_blank"
                rel="noopener noreferrer"
                id="cta-whatsapp-btn"
                className="inline-flex items-center gap-2 px-7 py-4 bg-white/10 hover:bg-white/20 border border-white/25 text-white font-bold text-sm rounded-xl transition-all duration-200 active:scale-[0.98] backdrop-blur-sm"
              >
                <MessageCircle size={17} />
                {t.cta.whatsapp}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
