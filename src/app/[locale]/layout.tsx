import type { Metadata } from 'next'
import type { Locale } from '@/types'
import { SiteChrome } from '@/components/layout/SiteChrome'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { WhatsAppButton } from '@/components/ui/WhatsAppButton'
import { LocaleAttributes } from '@/components/providers/LocaleAttributes'

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export async function generateStaticParams() {
  return [{ locale: 'ar' }, { locale: 'en' }]
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = (rawLocale === 'en' ? 'en' : 'ar') as Locale
  const isArabic = locale === 'ar'
  return {
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'ar': '/ar',
        'en': '/en',
      },
    },
    openGraph: {
      locale: isArabic ? 'ar_EG' : 'en_US',
      alternateLocale: isArabic ? 'en_US' : 'ar_EG',
    },
  }
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale: rawLocale } = await params
  const locale = (rawLocale === 'en' ? 'en' : 'ar') as Locale

  return (
    <div className="relative min-h-screen flex flex-col w-full max-w-full overflow-x-hidden">
      <LocaleAttributes locale={locale} />
      <SiteChrome><Navbar locale={locale} /></SiteChrome>
      <main id="main-content" className="flex-1 w-full max-w-full overflow-x-hidden">
        {children}
      </main>
      <SiteChrome><Footer locale={locale} /><WhatsAppButton locale={locale} /></SiteChrome>

    </div>
  )
}
