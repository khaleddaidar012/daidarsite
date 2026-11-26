import type { Metadata } from 'next'
import type { Locale } from '@/types'
import { ArticlesIndexClient } from '@/components/articles/ArticlesIndexClient'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = (rawLocale === 'en' ? 'en' : 'ar') as Locale
  const isArabic = locale === 'ar'

  return {
    title: isArabic ? 'المقالات | دعيدر للحلول البرمجية' : 'Articles | Daidar Solutions',
    description: isArabic
      ? 'مقالات وأدلة عملية من دعيدر للحلول البرمجية حول المواقع الإلكترونية، المتاجر، والأنظمة الرقمية.'
      : 'Practical articles and guides from Daidar Solutions on websites, online stores, and custom business systems.',
  }
}

export default async function ArticlesPage({ params }: Props) {
  const { locale: rawLocale } = await params
  const locale = (rawLocale === 'en' ? 'en' : 'ar') as Locale
  return <ArticlesIndexClient locale={locale} />
}
