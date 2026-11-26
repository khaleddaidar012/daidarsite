'use client'
import Link from 'next/link'
import { useProjects } from '@/components/portfolio/useProjects'
import { ArrowLeft, ArrowRight, Cloud, Globe, Settings2, ShoppingBag } from 'lucide-react'
import { getTranslations } from '@/locales'
import { getPublishedProjects } from '@/data/projects'
import type { Locale, Project } from '@/types'
import clsx from 'clsx'

interface PortfolioPreviewProps {
  locale: Locale
}

const categoryIcons: Record<string, React.ElementType> = {
  website: Globe,
  ecommerce: ShoppingBag,
  system: Settings2,
  saas: Cloud,
}

const categoryVisuals: Record<
  string,
  { badge: string; gradient: string }
> = {
  website: {
    badge: 'bg-[#e6f4fe] text-[#0284c7] border border-[#bae6fd]',
    gradient: 'from-[#0b2545] via-[#0f3a68] to-[#0284c7]',
  },
  ecommerce: {
    badge: 'bg-[#f3e8ff] text-[#7c3aed] border border-[#ddd6fe]',
    gradient: 'from-[#1e1b4b] via-[#3730a3] to-[#7c3aed]',
  },
  system: {
    badge: 'bg-[#ffedd5] text-[#ea580c] border border-[#fed7aa]',
    gradient: 'from-[#0b1f3a] via-[#133b66] to-[#0e7490]',
  },
  saas: {
    badge: 'bg-[#dcfce7] text-[#059669] border border-[#bbf7d0]',
    gradient: 'from-[#064e3b] via-[#047857] to-[#0284c7]',
  },
}

function ProjectCard({
  project,
  locale,
  t,
}: {
  project: Project
  locale: Locale
  t: ReturnType<typeof getTranslations>
}) {
  const isRTL = locale === 'ar'
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight
  const Icon = categoryIcons[project.category] ?? Settings2
  const style = categoryVisuals[project.category] ?? categoryVisuals.system

  const title = locale === 'ar' ? project.titleAr : project.titleEn
  const description = locale === 'ar' ? project.descriptionAr : project.descriptionEn
  const categoryLabel = t.portfolio.categories[project.category]

  return (
    <Link
      href={project.managed ? (project.link || `/${locale}/request`) : `/${locale}/portfolio/${project.slug}`}
      className="group bg-white dark:bg-[#132038] rounded-2xl border border-[#dde6f0] dark:border-[#1e3456] overflow-hidden flex flex-col h-full
                 shadow-[0_4px_20px_rgba(15,39,68,0.06)] hover:shadow-[0_12px_32px_rgba(2,132,199,0.14)]
                 hover:-translate-y-1 transition-all duration-300"
      aria-label={title}
    >
      {/* Visual Cover Header (uses project image or structured architectural banner) */}
      {project.image ? (
        <div className="relative h-44 w-full overflow-hidden bg-[#eaf3fb] dark:bg-[#0b1628] border-b border-[#e5edf5] dark:border-[#1e3456]">
          <img
            src={project.image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      ) : (
        <div
          className={`relative h-40 w-full overflow-hidden bg-gradient-to-br ${style.gradient} p-5 flex flex-col justify-between text-white`}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.22) 1px, transparent 1px)',
              backgroundSize: '26px 26px',
            }}
          />
          <div className="relative z-10 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
              <Icon size={12} />
              {categoryLabel}
            </span>
            <span className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-sky-200 group-hover:bg-white/25 transition-colors">
              <ArrowIcon size={16} />
            </span>
          </div>
          <div className="relative z-10">
            <span className="text-lg font-extrabold tracking-tight text-white/95 block truncate">
              {title}
            </span>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          {project.image && (
            <div className="flex items-center justify-between mb-3">
              <span
                className={clsx(
                  'inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg',
                  style.badge
                )}
              >
                <Icon size={11} />
                {categoryLabel}
              </span>
              <ArrowIcon
                size={15}
                className="text-[#8fa3bb] group-hover:text-[#0284c7] dark:group-hover:text-[#38bdf8] transition-colors duration-200"
              />
            </div>
          )}

          <h3 className="font-extrabold text-[#0f2744] dark:text-[#e8f0fb] text-base mb-2 group-hover:text-[#0284c7] dark:group-hover:text-[#38bdf8] transition-colors duration-200">
            {title}
          </h3>
          <p className="text-sm text-[#4a6080] dark:text-[#94b4d4] leading-relaxed">
            {description}
          </p>
        </div>

        {/* Tech tags */}
        <div className="mt-5 pt-4 border-t border-[#eef3f8] dark:border-[#1a2d48] flex flex-wrap gap-1.5">
          {(locale === 'ar' ? project.technologiesAr : project.technologiesEn)
            .slice(0, 3)
            .map((tech) => (
              <span
                key={tech}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#f4f8fc] dark:bg-[#1a2d48] text-[#425874] dark:text-[#9cb8d6] border border-[#e2ebf4] dark:border-[#243b5e]"
              >
                {tech}
              </span>
            ))}
        </div>
      </div>
    </Link>
  )
}

export function PortfolioPreview({ locale }: PortfolioPreviewProps) {
  const t = getTranslations(locale)
  const isRTL = locale === 'ar'
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight
  const projects = useProjects(getPublishedProjects()).slice(0, 3)

  return (
    <section
      id="portfolio-preview"
      className="py-20 lg:py-24 bg-white dark:bg-[#0d192d] border-b border-[#e2ebf4] dark:border-[#1a2c48]"
      aria-labelledby="portfolio-preview-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#e6f4fe] dark:bg-[#102542] border border-[#bae6fd]/80 dark:border-[#1e3a5f] px-3.5 py-1 text-xs font-bold text-[#0284c7] dark:text-[#38bdf8] mb-4">
              {t.portfolio.sectionLabel}
            </span>
            <h2
              id="portfolio-preview-heading"
              className="text-3xl sm:text-4xl font-extrabold text-[#0f2744] dark:text-[#e8f0fb] leading-snug mb-3"
            >
              {t.portfolio.title}
            </h2>
            <p className="text-base text-[#4a6080] dark:text-[#94b4d4] max-w-xl leading-relaxed">
              {t.portfolio.subtitle}
            </p>
          </div>
          <Link
            href={`/${locale}/portfolio`}
            className="btn-secondary whitespace-nowrap flex-shrink-0 font-bold"
          >
            {t.portfolio.viewAll}
            <ArrowIcon size={16} />
          </Link>
        </div>

        {/* Projects Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, i) => (
            <div
              key={project.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <ProjectCard project={project} locale={locale} t={t} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
