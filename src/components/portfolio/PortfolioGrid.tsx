'use client'

import { useState } from 'react'
import { useProjects } from './useProjects'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Globe, Settings2 } from 'lucide-react'
import { getTranslations } from '@/locales'
import type { Locale, Project } from '@/types'
import clsx from 'clsx'

interface PortfolioGridProps {
  locale: Locale
  projects: Project[]
}

const categoryColors: Record<string, string> = {
  website:   'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
  ecommerce: 'bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300',
  system:    'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
  saas:      'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
}

const categoryGradients: Record<string, string> = {
  website:   'from-blue-500 to-cyan-400',
  ecommerce: 'from-violet-500 to-purple-400',
  system:    'from-amber-500 to-orange-400',
  saas:      'from-emerald-500 to-teal-400',
}

export function PortfolioGrid({ locale, projects: initialProjects }: PortfolioGridProps) {
  const projects = useProjects(initialProjects)
  const t = getTranslations(locale)
  const isRTL = locale === 'ar'
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const categories = ['all', 'website', 'ecommerce', 'system', 'saas'] as const

  const filtered = activeCategory === 'all'
    ? projects
    : projects.filter((p) => p.category === activeCategory)

  return (
    <div>
      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={clsx(
              'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
              activeCategory === cat
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/25'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-brand-50 dark:hover:bg-brand-950/50 hover:text-brand-600 dark:hover:text-brand-400'
            )}
          >
            {t.portfolio.categories[cat as keyof typeof t.portfolio.categories]}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-600">
          {t.portfolio_page.noProjects}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((project, i) => {
            const title = locale === 'ar' ? project.titleAr : project.titleEn
            const description = locale === 'ar' ? project.descriptionAr : project.descriptionEn
            const gradient = categoryGradients[project.category]
            const colorClass = categoryColors[project.category]
            const categoryLabel = t.portfolio.categories[project.category as keyof typeof t.portfolio.categories]

            return (
              <Link
                key={project.id}
                href={project.managed ? (project.link || `/${locale}/request`) : `/${locale}/portfolio/${project.slug}`}
                className="card-base rounded-2xl overflow-hidden group block animate-fade-in-up"
                style={{ animationDelay: `${i * 0.08}s` }}
                aria-label={title}
              >
                {/* Visual header */}
                <div className={clsx('h-40 bg-gradient-to-br flex items-center justify-center', gradient)}>
                  {project.image ? <img src={project.image} alt={title} className="w-full h-full object-cover" /> : <Settings2 size={48} className="text-white/30" />}
                </div>

                <div className="p-6">
                  {/* Category */}
                  <span className={clsx('inline-flex text-xs font-semibold px-3 py-1 rounded-full mb-3', colorClass)}>
                    {categoryLabel}
                  </span>

                  <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                    {description}
                  </p>

                  {/* Tech tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(locale === 'ar' ? project.technologiesAr : project.technologiesEn)
                      .slice(0, 3)
                      .map((tech) => (
                        <span
                          key={tech}
                          className="text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400"
                        >
                          {tech}
                        </span>
                      ))}
                  </div>

                  <div className="flex items-center gap-1 text-brand-600 dark:text-brand-400 text-sm font-medium group-hover:gap-2 transition-all">
                    {t.portfolio.viewProject}
                    <ArrowIcon size={15} />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
