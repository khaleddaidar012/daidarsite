'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Calendar, Tag } from 'lucide-react'
import { getTranslations } from '@/locales'
import type { Locale } from '@/types'

export interface PublicArticleSummary {
  id: string
  slug: string
  title: string
  excerpt: string
  content?: string
  category_id: string
  category_slug: string
  category_name_ar: string
  category_name_en: string
  cover_url: string
  cover_alt: string
  published_at: number
  updated_at: number
}

export interface PublicArticleCategory {
  id: string
  slug: string
  name_ar: string
  name_en: string
  article_count?: number
}

export function formatArticleDate(timestamp: number, locale: Locale): string {
  return new Date(timestamp).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function ArticleCard({
  article,
  locale,
}: {
  article: PublicArticleSummary
  locale: Locale
}) {
  const t = getTranslations(locale)
  const isRTL = locale === 'ar'
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight
  const categoryName = locale === 'ar' ? article.category_name_ar : article.category_name_en || article.category_name_ar

  return (
    <Link
      href={`/${locale}/articles/${article.slug}`}
      className="group bg-white dark:bg-[#132038] rounded-2xl border border-[#dde6f0] dark:border-[#1e3456] overflow-hidden flex flex-col h-full
                 shadow-[0_4px_20px_rgba(15,39,68,0.06)] hover:shadow-[0_12px_32px_rgba(2,132,199,0.14)]
                 hover:-translate-y-1 transition-all duration-300"
      aria-label={article.title}
    >
      {/* Fixed-aspect cover prevents layout shift */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#eaf3fb] dark:bg-[#0b1628] border-b border-[#e5edf5] dark:border-[#1e3456]">
        <img
          src={article.cover_url}
          alt={article.cover_alt || article.title}
          loading="lazy"
          decoding="async"
          width={800}
          height={500}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      {/* Body */}
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-[#e6f4fe] dark:bg-[#102542] text-[#0284c7] dark:text-[#38bdf8] border border-[#bae6fd]/80 dark:border-[#1e3a5f]">
              <Tag size={11} />
              {categoryName}
            </span>
            <time
              dateTime={new Date(article.published_at).toISOString()}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#647b96] dark:text-[#8ea9c7]"
            >
              <Calendar size={12} />
              {formatArticleDate(article.published_at, locale)}
            </time>
          </div>

          <h3 className="font-extrabold text-[#0f2744] dark:text-[#e8f0fb] text-base sm:text-[17px] leading-snug mb-2.5 group-hover:text-[#0284c7] dark:group-hover:text-[#38bdf8] transition-colors line-clamp-2">
            {article.title}
          </h3>

          <p className="text-sm text-[#4a6080] dark:text-[#94b4d4] leading-relaxed line-clamp-3">
            {article.excerpt}
          </p>
        </div>

        <div className="mt-5 pt-4 border-t border-[#eef3f8] dark:border-[#1a2d48] flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-extrabold text-[#0284c7] dark:text-[#38bdf8] group-hover:gap-2.5 transition-all">
            {t.articles.readArticle}
            <ArrowIcon size={15} />
          </span>
        </div>
      </div>
    </Link>
  )
}

export function ArticleCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[#dde6f0] dark:border-[#1e3456] bg-white dark:bg-[#132038] overflow-hidden animate-pulse">
      <div className="aspect-[16/10] w-full bg-[#e6eef7] dark:bg-[#1a2d48]" />
      <div className="p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-24 rounded-lg bg-[#e6eef7] dark:bg-[#1a2d48]" />
          <div className="h-4 w-20 rounded bg-[#eef3f8] dark:bg-[#1a2d48]" />
        </div>
        <div className="h-5 w-4/5 rounded bg-[#e6eef7] dark:bg-[#1a2d48]" />
        <div className="h-4 w-full rounded bg-[#eef3f8] dark:bg-[#1a2d48]" />
        <div className="h-4 w-2/3 rounded bg-[#eef3f8] dark:bg-[#1a2d48]" />
      </div>
    </div>
  )
}
