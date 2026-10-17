import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Blocks, Sparkles } from 'lucide-react'

type Props = { params: Promise<{ locale: string }> }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    title: locale === 'ar' ? 'دعيدر هب | قريبًا' : 'Daidar Hub | Coming Soon',
    description: locale === 'ar' ? 'دعيدر هب — أدوات وأنظمة تساعدك تدير شغلك من مكان واحد. قريبًا.' : 'Daidar Hub — tools and systems for your business, together in one place. Coming soon.',
    alternates: { canonical: `/${locale}/coming-soon`, languages: { ar: '/ar/coming-soon', en: '/en/coming-soon' } },
  }
}
export default async function ComingSoonPage({ params }: Props) {
  const { locale } = await params
  const ar = locale === 'ar'
  const Arrow = ar ? ArrowLeft : ArrowRight
  return <section className="relative min-h-[80vh] flex items-center justify-center px-5 py-32 text-center bg-sky-50 dark:bg-[#0b1628] overflow-hidden">
    <div aria-hidden="true" className="absolute w-[500px] h-[500px] rounded-full bg-sky-200/30 dark:bg-sky-900/20 blur-3xl -top-40 -start-40" />
    <div className="relative max-w-2xl w-full rounded-3xl border border-white dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 p-8 sm:p-16 shadow-xl shadow-sky-900/5">
      <span className="inline-flex items-center gap-2 text-sky-600 dark:text-sky-400 text-sm font-bold"><Sparkles size={16} />{ar ? 'كل أدوات شغلك في مكان واحد' : 'Your work tools, together'}</span>
      <div className="mx-auto my-7 w-20 h-20 rounded-3xl bg-sky-100 dark:bg-sky-950 grid place-items-center text-sky-600 dark:text-sky-400"><Blocks size={38} /></div>
      <p className="font-bold text-slate-700 dark:text-slate-300 text-lg">{ar ? 'دعيدر هب' : 'Daidar Hub'}</p>
      <h1 className="text-5xl sm:text-7xl font-extrabold text-[#0f2744] dark:text-white mt-4 mb-6">{ar ? 'قريبًا' : 'Coming Soon'}<span className="text-sky-500">.</span></h1>
      <p className="text-slate-500 dark:text-slate-400 leading-loose">{ar ? 'بنجهز لك مساحة تجمع أنظمة وأدوات تساعدك تنظّم شغلك وتديره بسهولة. تابعنا، ولسه الجاي أحلى.' : 'We’re building a space for systems and tools that make running your business simpler. Stay tuned.'}</p>
      <Link href={`/${locale}`} className="btn-primary inline-flex mt-8">{ar ? 'العودة للرئيسية' : 'Back to Home'}<Arrow size={17} /></Link>
    </div>
  </section>
}
