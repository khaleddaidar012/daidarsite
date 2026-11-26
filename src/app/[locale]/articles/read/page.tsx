import type { Metadata } from 'next'
import type { Locale } from '@/types'
import { ArticleReaderClient } from '@/components/articles/ArticleReaderClient'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = (rawLocale === 'en' ? 'en' : 'ar') as Locale
  const isArabic = locale === 'ar'

  return {
    title: isArabic ? 'قراءة المقال | دعيدر للحلول البرمجية' : 'Read Article | Daidar Solutions',
    description: isArabic
      ? 'اقرأ المقالات التقنية والأدلة العملية من دعيدر للحلول البرمجية.'
      : 'Read technical articles and practical guides from Daidar Solutions.',
  }
}

export default async function ArticleReadPage({ params }: Props) {
  const { locale: rawLocale } = await params
  const locale = (rawLocale === 'en' ? 'en' : 'ar') as Locale
  return <ArticleReaderClient locale={locale} />
}
