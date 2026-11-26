'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X, Globe, Sun, Moon, Blocks, ArrowLeft, ArrowRight } from 'lucide-react'
import { getTranslations } from '@/locales'
import { useTheme } from '@/components/providers/ThemeProvider'
import type { Locale } from '@/types'
import clsx from 'clsx'

interface NavbarProps {
  locale: Locale
}

export function Navbar({ locale }: NavbarProps) {
  const t = getTranslations(locale)
  const pathname = usePathname()
  const { toggleTheme } = useTheme()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const isRTL = locale === 'ar'
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight
  const otherLocale: Locale = locale === 'ar' ? 'en' : 'ar'
  const localePath = pathname.replace(`/${locale}`, `/${otherLocale}`)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isMenuOpen])

  const navLinks = [
    { href: `/${locale}`, label: t.nav.home },
    { href: `/${locale}#about`, label: t.about.sectionLabel },
    { href: `/${locale}#services`, label: t.nav.services },
    { href: `/${locale}/portfolio`, label: t.nav.portfolio },
    { href: `/${locale}/hub`, label: locale === 'ar' ? 'دعيدر هب' : 'Daidar Hub' },
  ]

  const isActive = (href: string) => {
    if (href.includes('#')) return false
    return pathname === href
  }

  return (
    <header
      className={clsx(
        'fixed top-0 inset-x-0 z-40 transition-all duration-300 backdrop-blur-xl',
        scrolled
          ? 'bg-white/95 dark:bg-[#091323]/95 border-b border-[#d5e2f0] dark:border-[#1c3152] shadow-[0_8px_28px_rgba(12,34,62,0.08)]'
          : 'bg-white/85 dark:bg-[#091323]/85 border-b border-[#e5eef6] dark:border-[#162742]'
      )}
      style={{
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* Crisp brand top accent line */}
      <div
        aria-hidden="true"
        className="h-[2.5px] w-full bg-gradient-to-l from-[#0f2744] via-[#0284c7] to-[#38bdf8]"
      />

      <nav
        className="container mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-3"
        aria-label="Main navigation"
      >
        {/* Brand Identity */}
        <Link
          href={`/${locale}`}
          className="flex items-center gap-3 focus-visible:ring-2 focus-visible:ring-[#38bdf8] rounded-xl group shrink-0"
          aria-label="دعيدر للحلول البرمجية - الصفحة الرئيسية"
        >
          <div className="relative w-10 h-10 rounded-xl bg-[#f3f8fd] dark:bg-[#11223d] border border-[#dce8f5] dark:border-[#1e3557] p-1.5 flex-shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-sm">
            <Image
              src="/logo.png"
              alt="شعار دعيدر للحلول البرمجية"
              fill
              sizes="40px"
              className="object-contain p-1 dark:hidden"
              priority
            />
            <Image
              src="/logo-light.png"
              alt="شعار دعيدر للحلول البرمجية"
              fill
              sizes="40px"
              className="object-contain p-1 hidden dark:block"
              priority
            />
          </div>
          <div className="hidden sm:block leading-tight">
            <span className="block font-extrabold text-[#0f2744] dark:text-[#eef5fd] text-sm">
              {locale === 'ar' ? 'دعيدر للحلول البرمجية' : 'Daidar Solutions'}
            </span>
            <span className="block text-[11px] font-bold text-[#0284c7] dark:text-[#38bdf8] mt-0.5">
              {t.about.slogan}
            </span>
          </div>
        </Link>

        {/* Centered Pill Navigation (Desktop) */}
        <div className="hidden lg:flex items-center gap-1 rounded-full border border-[#dfe9f4] dark:border-[#1c3252] bg-[#f5f9fd] dark:bg-[#0e1b31] p-1.5 shadow-inner">
          {navLinks.map((link) => {
            const active = isActive(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap',
                  active
                    ? 'bg-white dark:bg-[#162a49] text-[#0284c7] dark:text-[#38bdf8] shadow-sm border border-[#dbe7f3] dark:border-[#24406b]'
                    : 'text-[#425874] dark:text-[#9cb8d6] hover:text-[#0f2744] dark:hover:text-white hover:bg-white/70 dark:hover:bg-[#162a49]/70'
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Unified Utility Capsule: Theme + Language */}
          <div className="hidden sm:flex items-center rounded-xl border border-[#dce6f2] dark:border-[#1e3456] bg-[#f7fafd] dark:bg-[#0f1d34] p-0.5">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg text-[#0f2744] dark:text-amber-300 hover:bg-white dark:hover:bg-[#172a47] transition-colors cursor-pointer"
              aria-label="تبديل المظهر / Toggle theme"
              id="theme-toggle-btn"
            >
              <Sun size={16} className="hidden dark:block" />
              <Moon size={16} className="block dark:hidden" />
            </button>
            <span className="h-4 w-px bg-[#dce6f2] dark:bg-[#1e3456]" aria-hidden="true" />
            <Link
              href={localePath}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#425874] dark:text-[#9cb8d6] hover:text-[#0284c7] dark:hover:text-[#38bdf8] hover:bg-white dark:hover:bg-[#172a47] transition-colors"
              aria-label={`Switch to ${otherLocale === 'ar' ? 'Arabic' : 'English'}`}
            >
              <Globe size={13} />
              <span>{t.lang.switchTo}</span>
            </Link>
          </div>

          {/* Primary Request CTA */}
          <Link
            href={`/${locale}/request`}
            className="hidden md:inline-flex items-center gap-1.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm shadow-sky-600/20 transition-all active:scale-95"
            id="nav-request-btn"
          >
            <span>{t.nav.requestService}</span>
            <ArrowIcon size={14} />
          </Link>

          {/* Daidar Hub Portal Button */}
          <Link
            href={`/${locale}/hub`}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-[#0c2747] hover:bg-[#133863] dark:bg-[#163459] dark:hover:bg-[#1e4675] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition-all active:scale-95"
          >
            <Blocks size={15} className="text-[#7dd3fc]" />
            <span>{locale === 'ar' ? 'دعيدر هب' : 'Daidar Hub'}</span>
          </Link>

          {/* Mobile Theme Quick Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="sm:hidden p-2 rounded-xl border border-[#dce6f2] dark:border-[#1e3456] text-[#0f2744] dark:text-amber-300"
            aria-label="تبديل المظهر / Toggle theme"
          >
            <Sun size={17} className="hidden dark:block" />
            <Moon size={17} className="block dark:hidden" />
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-xl border border-[#dce6f2] dark:border-[#1e3456] text-[#0f2744] dark:text-[#e8f0fb] hover:bg-[#f1f5f9] dark:hover:bg-[#1a2d48] transition-colors cursor-pointer"
            aria-label={isMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div
        className={clsx(
          'lg:hidden fixed inset-0 top-[75px] z-30 transition-all duration-300',
          isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        )}
      >
        <div
          className="absolute inset-0 bg-[#0f2744]/25 backdrop-blur-sm"
          onClick={() => setIsMenuOpen(false)}
        />
        <div
          className={clsx(
            'relative bg-white dark:bg-[#0b1628] border-b border-[#e2e8f0] dark:border-[#1e3456] p-5 transition-transform duration-300 shadow-xl',
            isMenuOpen ? 'translate-y-0' : '-translate-y-2'
          )}
        >
          <div className="flex flex-col gap-1 mb-5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className={clsx(
                  'px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200',
                  isActive(link.href)
                    ? 'text-[#0284c7] dark:text-[#38bdf8] bg-[#eff8ff] dark:bg-[#132038]'
                    : 'text-[#0f2744] dark:text-[#e8f0fb] hover:text-[#0284c7] hover:bg-[#f8fafc] dark:hover:bg-[#1a2d48]'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-2.5">
            <Link
              href={`/${locale}/request`}
              onClick={() => setIsMenuOpen(false)}
              className="btn-primary text-center font-bold"
            >
              {t.nav.requestService}
            </Link>
            <Link
              href={`/${locale}/hub`}
              onClick={() => setIsMenuOpen(false)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0c2747] px-5 py-3 text-sm font-bold text-white"
            >
              <Blocks size={17} className="text-[#7dd3fc]" />
              {locale === 'ar' ? 'دعيدر هب' : 'Daidar Hub'}
            </Link>
            <Link
              href={localePath}
              onClick={() => setIsMenuOpen(false)}
              className="btn-secondary text-center"
            >
              <Globe size={15} />
              {t.lang.switchTo}
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
