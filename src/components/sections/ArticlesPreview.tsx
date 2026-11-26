'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, ArrowRight, BookOpen, RefreshCw } from 'lucide-react'
import { getTranslations } from '@/locales'
import type { Locale } from '@/types'
import { ArticleCard, ArticleCardSkeleton, type PublicArticleSummary } from '@/components/articles/ArticleCard'

export function ArticlesPreview({ locale }: { locale: Locale }) {
  const t = getTranslations(locale)
  const isRTL = locale === 'ar'
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight
  const [articles, setArticles] = useState<PublicArticleSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const response = await fetch('/api/articles?limit=6', { cache: 'no-store' })
      if (!response.ok) throw new Error('Failed to load articles')
      const data = await response.json()
      setArticles(Array.isArray(data.articles) ? data.articles : [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section
      id="articles"
      className="py-20 lg:py-24 bg-[#f7fafd] dark:bg-[#0b1628] border-b border-[#e2ebf4] dark:border-[#1a2c48]"
      aria-labelledby="articles-preview-heading"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#e6f4fe] dark:bg-[#102542] border border-[#bae6fd]/80 dark:border-[#1e3a5f] px-3.5 py-1 text-xs font-bold text-[#0284c7] dark:text-[#38bdf8] mb-4">
              {t.articles.sectionLabel}
            </span>
            <h2
              id="articles-preview-heading"
              className="text-3xl sm:text-4xl font-extrabold text-[#0f2744] dark:text-[#e8f0fb] leading-snug mb-3"
            >
              {t.articles.homeTitle}
            </h2>
            <p className="text-base text-[#4a6080] dark:text-[#94b4d4] max-w-xl leading-relaxed">
              {t.articles.homeSubtitle}
            </p>
          </div>
          <Link
            href={`/${locale}/articles`}
            className="btn-secondary whitespace-nowrap flex-shrink-0 font-bold"
          >
            {t.articles.viewAll}
            <ArrowIcon size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((idx) => (
              <ArticleCardSkeleton key={idx} />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-[#132038] p-8 text-center max-w-lg mx-auto">
            <AlertCircle size={32} className="mx-auto text-red-500 mb-3" />
            <h3 className="font-bold text-[#0f2744] dark:text-[#e8f0fb] mb-1.5">{t.articles.errorTitle}</h3>
            <p className="text-sm text-[#4a6080] dark:text-[#94b4d4] mb-5">{t.articles.errorDesc}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="btn-primary inline-flex items-center gap-2 text-sm"
            >
              <RefreshCw size={15} />
              {t.articles.retry}
            </button>
          </div>
        ) : !articles.length ? (
          <div className="rounded-2xl border border-dashed border-[#cfdce9] dark:border-[#1e3456] bg-white/80 dark:bg-[#132038]/80 p-10 text-center max-w-xl mx-auto">
            <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#e6f4fe] dark:bg-[#102542] text-[#0284c7] dark:text-[#38bdf8]">
              <BookOpen size={22} />
            </span>
            <h3 className="font-extrabold text-[#0f2744] dark:text-[#e8f0fb] text-lg mb-1.5">
              {t.articles.emptyTitle}
            </h3>
            <p className="text-sm text-[#4a6080] dark:text-[#94b4d4] leading-relaxed">
              {t.articles.emptyDesc}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
