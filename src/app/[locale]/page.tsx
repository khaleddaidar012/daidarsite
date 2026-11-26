import type { Metadata } from 'next'
import type { Locale } from '@/types'
import { HeroSection } from '@/components/sections/HeroSection'
import { AboutSection } from '@/components/sections/AboutSection'
import { ServicesSection } from '@/components/sections/ServicesSection'
import { PortfolioPreview } from '@/components/sections/PortfolioPreview'
import { ArticlesPreview } from '@/components/sections/ArticlesPreview'
import { CtaSection } from '@/components/sections/CtaSection'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = (rawLocale === 'en' ? 'en' : 'ar') as Locale
  const isArabic = locale === 'ar'
  
  return {
    title: isArabic
      ? 'دعيدر للحلول البرمجية | شريكك التقني لتطوير شغلك'
      : 'Daidar Solutions | Your Technical Partner for Business Growth',
    description: isArabic
      ? 'دعيدر للحلول البرمجية تقدم مواقع إلكترونية، متاجر إلكترونية، أنظمة مخصصة وحلول SaaS احترافية. شريكك التقني لتطوير شغلك.'
      : 'Daidar Solutions offers professional websites, e-commerce stores, custom systems, and SaaS solutions. Your technical partner for business growth.',
  }
}

export default async function HomePage({ params }: Props) {
  const { locale: rawLocale } = await params
  const locale = (rawLocale === 'en' ? 'en' : 'ar') as Locale

  return (
    <>
      <HeroSection locale={locale} />
      <AboutSection locale={locale} />
      <ServicesSection locale={locale} />
      <PortfolioPreview locale={locale} />
      <ArticlesPreview locale={locale} />
      <CtaSection locale={locale} />
    </>
  )
}
