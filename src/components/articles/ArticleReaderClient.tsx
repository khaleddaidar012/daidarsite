'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Clock,
  FileQuestion,
  RefreshCw,
  Share2,
  Tag,
} from 'lucide-react'
import { getTranslations } from '@/locales'
import type { Locale } from '@/types'
import { estimateReadingMinutes } from '@/lib/article-content'
import { ArticleBody } from './ArticleBody'
import { formatArticleDate, type PublicArticleSummary } from './ArticleCard'

function resolveSlugFromLocation(): string {
  if (typeof window === 'undefined') return ''
  const params = new URLSearchParams(window.location.search)
  const fromQuery = (params.get('slug') || '').trim().toLowerCase()
  if (fromQuery) return fromQuery
  const match = window.location.pathname.match(/^\/(?:ar|en)\/articles\/([a-z0-9-]+)\/?$/i)
  if (match && match[1].toLowerCase() !== 'read') return match[1].toLowerCase()
  return ''
}

export function ArticleReaderClient({ locale }: { locale: Locale }) {
  const t = getTranslations(locale)
  const isRTL = locale === 'ar'
  const BackArrow = isRTL ? ArrowRight : ArrowLeft
  const ForwardArrow = isRTL ? ArrowLeft : ArrowRight

  const [slug, setSlug] = useState('')
  const [article, setArticle] = useState<PublicArticleSummary | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'not_found' | 'error'>('loading')
  const [copied, setCopied] = useState(false)

  const loadArticle = useCallback(async (targetSlug: string) => {
    if (!targetSlug) {
      setStatus('not_found')
      return
    }
    setStatus('loading')
    try {
      const response = await fetch(`/api/articles?slug=${encodeURIComponent(targetSlug)}`, {
        cache: 'no-store',
      })
      if (response.status === 404) {
        setArticle(null)
        setStatus('not_found')
        return
      }
      if (!response.ok) throw new Error('Failed to load article')
      const data = await response.json()
      if (!data.article) {
        setArticle(null)
        setStatus('not_found')
        return
      }
      setArticle(data.article)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    const resolved = resolveSlugFromLocation()
    setSlug(resolved)
    void loadArticle(resolved)
  }, [loadArticle])

  useEffect(() => {
    if (!article) return
    const brand = locale === 'ar' ? 'دعيدر للحلول البرمجية' : 'Daidar Solutions'
    document.title = `${article.title} | ${brand}`
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc && article.excerpt) {
      metaDesc.setAttribute('content', article.excerpt)
    }
  }, [article, locale])

  async function copyArticleUrl() {
    if (!article) return
    const url = `${window.location.origin}/${locale}/articles/${article.slug}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7fafd] dark:bg-[#0b1628] pt-28 pb-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        {/* Back link */}
        <div className="mb-7">
          <Link
            href={`/${locale}/articles`}
            className="inline-flex items-center gap-2 rounded-xl border border-[#dce6f2] dark:border-[#1e3456] bg-white dark:bg-[#132038] px-4 py-2 text-xs sm:text-sm font-bold text-[#0f2744] dark:text-[#e8f0fb] hover:border-[#0284c7] hover:text-[#0284c7] transition-colors"
          >
            <BackArrow size={15} />
            {t.articles.backToArticles}
          </Link>
        </div>

        {status === 'loading' ? (
          <div className="rounded-3xl border border-[#dde6f0] dark:border-[#1e3456] bg-white dark:bg-[#132038] p-6 sm:p-10 space-y-6 animate-pulse">
            <div className="h-6 w-32 rounded-lg bg-[#e6eef7] dark:bg-[#1a2d48]" />
            <div className="h-10 w-4/5 rounded-xl bg-[#e6eef7] dark:bg-[#1a2d48]" />
            <div className="aspect-[16/10] w-full rounded-2xl bg-[#e6eef7] dark:bg-[#1a2d48]" />
            <div className="space-y-3 pt-2">
              <div className="h-4 w-full rounded bg-[#eef3f8] dark:bg-[#1a2d48]" />
              <div className="h-4 w-5/6 rounded bg-[#eef3f8] dark:bg-[#1a2d48]" />
              <div className="h-4 w-4/6 rounded bg-[#eef3f8] dark:bg-[#1a2d48]" />
            </div>
          </div>
        ) : status === 'not_found' ? (
          <div className="rounded-3xl border border-[#dde6f0] dark:border-[#1e3456] bg-white dark:bg-[#132038] p-10 sm:p-14 text-center">
            <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#e6f4fe] dark:bg-[#102542] text-[#0284c7] dark:text-[#38bdf8]">
              <FileQuestion size={28} />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f2744] dark:text-[#e8f0fb] mb-3">
              {t.articles.notFoundTitle}
            </h1>
            <p className="text-sm sm:text-base text-[#4a6080] dark:text-[#94b4d4] max-w-md mx-auto mb-7 leading-relaxed">
              {t.articles.notFoundDesc}
            </p>
            <Link href={`/${locale}/articles`} className="btn-primary inline-flex items-center gap-2 text-sm">
              <BackArrow size={15} />
              {t.articles.backToArticles}
            </Link>
          </div>
        ) : status === 'error' ? (
          <div className="rounded-3xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-[#132038] p-10 text-center">
            <AlertCircle size={36} className="mx-auto text-red-500 mb-3" />
            <h1 className="text-xl font-extrabold text-[#0f2744] dark:text-[#e8f0fb] mb-2">
              {t.articles.errorTitle}
            </h1>
            <p className="text-sm text-[#4a6080] dark:text-[#94b4d4] mb-6">{t.articles.errorDesc}</p>
            <button
              type="button"
              onClick={() => void loadArticle(slug)}
              className="btn-primary inline-flex items-center gap-2 text-sm"
            >
              <RefreshCw size={15} />
              {t.articles.retry}
            </button>
          </div>
        ) : article ? (
          <article className="space-y-8">
            <div className="rounded-3xl border border-[#dde6f0] dark:border-[#1e3456] bg-white dark:bg-[#132038] overflow-hidden shadow-[0_8px_32px_rgba(15,39,68,0.06)]">
              {/* Header Meta */}
              <div className="p-6 sm:p-10 pb-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link
                      href={`/${locale}/articles`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#e6f4fe] dark:bg-[#102542] border border-[#bae6fd]/80 dark:border-[#1e3a5f] px-3 py-1.5 text-xs font-bold text-[#0284c7] dark:text-[#38bdf8]"
                    >
                      <Tag size={12} />
                      {locale === 'ar'
                        ? article.category_name_ar
                        : article.category_name_en || article.category_name_ar}
                    </Link>

                    <time
                      dateTime={new Date(article.published_at).toISOString()}
                      className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#5c738f] dark:text-[#94b4d4]"
                    >
                      <Calendar size={14} />
                      {formatArticleDate(article.published_at, locale)}
                    </time>

                    {article.content && (
                      <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#5c738f] dark:text-[#94b4d4]">
                        <Clock size={14} />
                        {(() => {
                          const mins = estimateReadingMinutes(article.content)
                          if (mins === 1) return t.articles.readingOneMinute
                          return locale === 'ar'
                            ? `${mins.toLocaleString('ar-EG')} ${t.articles.readingMinutes}`
                            : `${mins} ${t.articles.readingMinutes}`
                        })()}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => void copyArticleUrl()}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#dce6f2] dark:border-[#1e3456] bg-[#f7fafd] dark:bg-[#0f1d34] px-3 py-1.5 text-xs font-bold text-[#425874] dark:text-[#9cb8d6] hover:border-[#0284c7] hover:text-[#0284c7] transition-colors cursor-pointer"
                  >
                    {copied ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
                    <span>{copied ? t.articles.copied : t.articles.copyLink}</span>
                  </button>
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold text-[#0f2744] dark:text-[#f0f6fe] leading-[1.35] text-balance">
                  {article.title}
                </h1>
              </div>

              {/* Cover Image */}
              <div className="px-6 sm:px-10">
                <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl bg-[#eaf3fb] dark:bg-[#0b1628] border border-[#e5edf5] dark:border-[#1e3456]">
                  <img
                    src={article.cover_url}
                    alt={article.cover_alt || article.title}
                    width={1200}
                    height={750}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              {/* Safe Formatted Body */}
              <div className="p-6 sm:p-10 pt-8">
                <ArticleBody content={article.content || ''} />
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="rounded-3xl bg-gradient-to-br from-[#0f2744] via-[#13355c] to-[#0284c7] p-7 sm:p-9 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-lg">
              <div className="space-y-1.5 max-w-xl">
                <h2 className="text-xl sm:text-2xl font-extrabold">{t.articles.ctaTitle}</h2>
                <p className="text-sm sm:text-base text-sky-100/90 leading-relaxed">{t.articles.ctaDesc}</p>
              </div>
              <Link
                href={`/${locale}/request`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-extrabold text-[#0f2744] hover:bg-sky-50 transition-colors shrink-0"
              >
                {t.nav.requestService}
                <ForwardArrow size={16} />
              </Link>
            </div>
          </article>
        ) : null}
      </div>
    </div>
  )
}
