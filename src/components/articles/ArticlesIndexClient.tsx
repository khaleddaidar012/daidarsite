'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, BookOpen, RefreshCw, Search } from 'lucide-react'
import clsx from 'clsx'
import { getTranslations } from '@/locales'
import type { Locale } from '@/types'
import {
  ArticleCard,
  ArticleCardSkeleton,
  type PublicArticleCategory,
  type PublicArticleSummary,
} from './ArticleCard'

export function ArticlesIndexClient({ locale }: { locale: Locale }) {
  const t = getTranslations(locale)
  const [articles, setArticles] = useState<PublicArticleSummary[]>([])
  const [categories, setCategories] = useState<PublicArticleCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const response = await fetch('/api/articles?limit=100', { cache: 'no-store' })
      if (!response.ok) throw new Error('Failed to fetch articles')
      const data = await response.json()
      setArticles(Array.isArray(data.articles) ? data.articles : [])
      setCategories(Array.isArray(data.categories) ? data.categories : [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return articles.filter((item) => {
      if (selectedCategory !== 'all' && item.category_slug !== selectedCategory) return false
      if (!q) return true
      return (
        item.title.toLowerCase().includes(q) ||
        item.excerpt.toLowerCase().includes(q) ||
        item.category_name_ar.toLowerCase().includes(q) ||
        item.category_name_en.toLowerCase().includes(q)
      )
    })
  }, [articles, selectedCategory, query])

  return (
    <div className="min-h-screen bg-[#f7fafd] dark:bg-[#0b1628] pt-28 pb-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="max-w-3xl mb-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#e6f4fe] dark:bg-[#102542] border border-[#bae6fd]/80 dark:border-[#1e3a5f] px-3.5 py-1 text-xs font-bold text-[#0284c7] dark:text-[#38bdf8] mb-4">
            {t.articles.sectionLabel}
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#0f2744] dark:text-[#e8f0fb] leading-tight mb-4">
            {t.articles.pageTitle}
          </h1>
          <p className="text-base sm:text-lg text-[#4a6080] dark:text-[#94b4d4] leading-relaxed">
            {t.articles.pageSubtitle}
          </p>
        </div>

        {/* Filter & Search Bar */}
        {!error && (categories.length > 0 || articles.length > 0) && (
          <div className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-[#dde6f0] dark:border-[#1e3456] bg-white dark:bg-[#132038] p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={clsx(
                  'rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer',
                  selectedCategory === 'all'
                    ? 'bg-[#0284c7] text-white shadow-sm'
                    : 'bg-[#f4f8fc] dark:bg-[#1a2d48] text-[#425874] dark:text-[#9cb8d6] hover:bg-[#e6f4fe] dark:hover:bg-[#22395b]'
                )}
              >
                {t.articles.allCategories}
              </button>
              {categories.map((cat) => {
                const active = selectedCategory === cat.slug
                const label = locale === 'ar' ? cat.name_ar : cat.name_en || cat.name_ar
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={clsx(
                      'rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer',
                      active
                        ? 'bg-[#0284c7] text-white shadow-sm'
                        : 'bg-[#f4f8fc] dark:bg-[#1a2d48] text-[#425874] dark:text-[#9cb8d6] hover:bg-[#e6f4fe] dark:hover:bg-[#22395b]'
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            <div className="relative w-full lg:w-72 shrink-0">
              <Search
                size={16}
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3.5 text-[#7f96b0]"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.articles.searchPlaceholder}
                className="w-full rounded-xl border border-[#dce6f2] dark:border-[#1e3456] bg-[#f7fafd] dark:bg-[#0f1d34] ps-10 pe-3.5 py-2.5 text-sm text-[#0f2744] dark:text-[#e8f0fb] placeholder:text-[#7f96b0] focus:outline-none focus:ring-2 focus:ring-[#0284c7]"
              />
            </div>
          </div>
        )}

        {/* Grid / States */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <ArticleCardSkeleton key={idx} />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-[#132038] p-10 text-center max-w-lg mx-auto">
            <AlertCircle size={36} className="mx-auto text-red-500 mb-3" />
            <h2 className="font-extrabold text-[#0f2744] dark:text-[#e8f0fb] text-lg mb-2">
              {t.articles.errorTitle}
            </h2>
            <p className="text-sm text-[#4a6080] dark:text-[#94b4d4] mb-6">{t.articles.errorDesc}</p>
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
          <div className="rounded-2xl border border-dashed border-[#cfdce9] dark:border-[#1e3456] bg-white dark:bg-[#132038] p-12 text-center max-w-xl mx-auto">
            <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#e6f4fe] dark:bg-[#102542] text-[#0284c7] dark:text-[#38bdf8]">
              <BookOpen size={26} />
            </span>
            <h2 className="font-extrabold text-[#0f2744] dark:text-[#e8f0fb] text-xl mb-2">
              {t.articles.emptyTitle}
            </h2>
            <p className="text-sm text-[#4a6080] dark:text-[#94b4d4] leading-relaxed">
              {t.articles.emptyDesc}
            </p>
          </div>
        ) : !filtered.length ? (
          <div className="rounded-2xl border border-dashed border-[#cfdce9] dark:border-[#1e3456] bg-white dark:bg-[#132038] p-10 text-center max-w-xl mx-auto">
            <p className="text-sm font-bold text-[#4a6080] dark:text-[#94b4d4] mb-4">
              {t.articles.emptyFiltered}
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all')
                setQuery('')
              }}
              className="btn-secondary text-sm"
            >
              {t.articles.allCategories}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((article) => (
              <ArticleCard key={article.id} article={article} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
