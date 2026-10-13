'use client'
import Link from 'next/link'
import { useProjects } from '@/components/portfolio/useProjects'
import { ArrowLeft, ArrowRight, Globe, Settings2 } from 'lucide-react'
import { getTranslations } from '@/locales'
import { getPublishedProjects } from '@/data/projects'
import type { Locale, Project } from '@/types'
import clsx from 'clsx'

interface PortfolioPreviewProps {
  locale: Locale
}

const categoryIcons: Record<string, React.ElementType> = {
  website: Globe,
  ecommerce: Globe,
  system: Settings2,
  saas: Globe,
}

const categoryColors: Record<string, string> = {
  website:   'bg-[#eff8ff] text-[#38bdf8] border border-[#bfe3fd]',
  ecommerce: 'bg-[#f5f3ff] text-[#8b5cf6] border border-[#ddd6fe]',
  system:    'bg-[#fff7ed] text-[#f97316] border border-[#fed7aa]',
  saas:      'bg-[#f0fdf4] text-[#22c55e] border border-[#bbf7d0]',
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
  const colorClass = categoryColors[project.category] ?? categoryColors.system

  const title = locale === 'ar' ? project.titleAr : project.titleEn
  const description = locale === 'ar' ? project.descriptionAr : project.descriptionEn
  const categoryLabel = t.portfolio.categories[project.category]

  return (
    <Link
      href={project.managed ? project.link! : `/${locale}/portfolio/${project.slug}`}
      className="group block bg-white dark:bg-[#132038] rounded-2xl border border-[#e2e8f0] dark:border-[#1e3456] p-6 flex flex-col
                 shadow-[0_2px_12px_rgba(15,39,68,0.05)] hover:shadow-[0_8px_28px_rgba(56,189,248,0.12)]
                 hover:-translate-y-0.5 transition-all duration-300"
      aria-label={title}
    >
      {project.image && <img src={project.image} alt={title} className="w-full h-40 object-cover rounded-xl mb-4" />}
      {/* Category badge */}
      <div className="flex items-center justify-between mb-4">
        <span
          className={clsx(
            'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg',
            colorClass
          )}
        >
          <Icon size={11} />
          {categoryLabel}
        </span>
        <ArrowIcon
          size={15}
          className="text-[#8fa3bb] group-hover:text-[#38bdf8] transition-colors duration-200"
        />
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className="font-bold text-[#0f2744] dark:text-[#e8f0fb] text-base mb-2 group-hover:text-[#38bdf8] transition-colors duration-200">
          {title}
        </h3>
        <p className="text-sm text-[#4a6080] dark:text-[#94b4d4] leading-relaxed">
          {description}
        </p>
      </div>

      {/* Tech tags */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {(locale === 'ar' ? project.technologiesAr : project.technologiesEn)
          .slice(0, 3)
          .map((tech) => (
            <span
              key={tech}
              className="text-xs px-2 py-0.5 rounded-md bg-[#f1f5f9] dark:bg-[#1a2d48] text-[#4a6080] dark:text-[#94b4d4] border border-[#e2e8f0] dark:border-[#1e3456]"
            >
              {tech}
            </span>
          ))}
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
      className="section-padding bg-[#f8fafc] dark:bg-[#0b1628]"
      aria-labelledby="portfolio-preview-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <span className="section-label">{t.portfolio.sectionLabel}</span>
            <h2 id="portfolio-preview-heading" className="section-title">
              {t.portfolio.title}
            </h2>
            <p className="section-subtitle max-w-xl">
              {t.portfolio.subtitle}
            </p>
          </div>
          <Link
            href={`/${locale}/portfolio`}
            className="btn-secondary whitespace-nowrap flex-shrink-0"
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
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              <ProjectCard project={project} locale={locale} t={t} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
