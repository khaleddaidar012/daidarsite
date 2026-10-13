'use client'
import { useProjects } from './useProjects'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2, Code2 } from 'lucide-react'
import { getTranslations } from '@/locales'
import type { Locale, Project } from '@/types'
import clsx from 'clsx'

interface ProjectDetailProps {
  locale: Locale
  project: Project
}

const categoryGradients: Record<string, string> = {
  website:   'from-blue-500 to-cyan-400',
  ecommerce: 'from-violet-500 to-purple-400',
  system:    'from-amber-500 to-orange-400',
  saas:      'from-emerald-500 to-teal-400',
}

export function ProjectDetail({ locale, project: initial }: ProjectDetailProps) {
  const project = useProjects([initial]).find(p => p.id === initial.id)
  if (!project) return <div className="pt-32 text-center pb-20">{locale === 'ar' ? 'هذا المشروع غير متاح حاليًا' : 'This project is currently unavailable'}<p><Link href={`/${locale}/portfolio`}>{locale === 'ar' ? 'العودة للأعمال' : 'Back to portfolio'}</Link></p></div>
  const t = getTranslations(locale)
  const isRTL = locale === 'ar'
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight
  const BackArrow = isRTL ? ArrowRight : ArrowLeft

  const title = locale === 'ar' ? project.titleAr : project.titleEn
  const description = locale === 'ar' ? project.descriptionAr : project.descriptionEn
  const longDescription = locale === 'ar' ? project.longDescriptionAr : project.longDescriptionEn
  const technologies = locale === 'ar' ? project.technologiesAr : project.technologiesEn
  const features = locale === 'ar' ? project.featuresAr : project.featuresEn
  const gradient = categoryGradients[project.category]

  return (
    <div className="pt-24 pb-20">
      {/* Hero Banner */}
      <div className={clsx('h-64 sm:h-80 bg-gradient-to-br flex items-center justify-center', gradient)}>
        {project.image && <img src={project.image} alt={locale === 'ar' ? project.titleAr : project.titleEn} className="h-full max-w-[50%] object-contain" />}
        <div className="text-center text-white">
          <Code2 size={56} className="mx-auto mb-4 opacity-40" />
          <h1 className="text-3xl sm:text-4xl font-bold">{title}</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back link */}
        <Link
          href={`/${locale}/portfolio`}
          className="inline-flex items-center gap-2 text-brand-600 dark:text-brand-400 hover:underline mb-8 text-sm font-medium"
        >
          <BackArrow size={16} />
          {t.portfolio_page.backToPortfolio}
        </Link>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                {longDescription}
              </p>
            </div>

            {/* Features */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle2 size={20} className="text-brand-500" />
                {t.portfolio_page.keyFeatures}
              </h2>
              <ul className="space-y-3">
                {features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-gray-700 dark:text-gray-300"
                  >
                    <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0 mt-2" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tech Stack */}
            <div className="card-base rounded-2xl p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                {t.portfolio_page.technologies}
              </h3>
              <div className="flex flex-wrap gap-2">
                {technologies.map((tech) => (
                  <span
                    key={tech}
                    className="text-sm px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 border border-brand-100 dark:border-brand-900 font-medium"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="card-base rounded-2xl p-6 text-center">
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                {locale === 'ar'
                  ? 'هل تريد مشروعاً مشابهاً؟'
                  : 'Want a similar project?'}
              </p>
              <Link
                href={`/${locale}/request?service=${project.category}`}
                className="btn-primary w-full justify-center"
              >
                {t.portfolio_page.requestSimilar}
                <ArrowIcon size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
