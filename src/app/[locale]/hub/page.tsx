import type { Metadata } from 'next'
import HubPortal from '@/components/hub/HubPortal'

type Props = { params: Promise<{ locale: string }> }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const ar = locale !== 'en'
  return { title: ar ? 'دعيدر هب | أنظمتك واشتراكاتك' : 'Daidar Hub | Systems and subscriptions', description: ar ? 'اختر نظامك ونظّم اشتراك دعيدر هب.' : 'Choose your system and manage your Daidar Hub subscription.', alternates: { canonical: `/${ar ? 'ar' : 'en'}/hub` } }
}
export default async function HubPage({ params }: Props) {
  const { locale } = await params
  return <HubPortal locale={locale === 'en' ? 'en' : 'ar'} />
}
