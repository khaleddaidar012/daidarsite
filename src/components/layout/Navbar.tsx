'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X, Globe, Sun, Moon, Blocks } from 'lucide-react'
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
  const { theme, toggleTheme } = useTheme()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const otherLocale: Locale = locale === 'ar' ? 'en' : 'ar'
  const localePath = pathname.replace(`/${locale}`, `/${otherLocale}`)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
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
        'fixed top-0 inset-x-0 z-40 bg-white dark:bg-[#0b1628] border-b border-[#dde3eb] dark:border-[#1e3456] transition-shadow duration-200',
        scrolled
          ? 'shadow-[0_4px_20px_rgba(18,40,64,0.07)]'
          : 'shadow-[0_1px_6px_rgba(18,40,64,0.03)]'
      )}
      style={{
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <nav
        className="container mx-auto px-6 sm:px-6 lg:px-8 h-16 flex items-center justify-between"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2.5 focus-visible:ring-2 focus-visible:ring-[#38bdf8] rounded-lg group"
          aria-label="دعيدر للحلول البرمجية - الصفحة الرئيسية"
        >
          <div className="relative w-9 h-9 flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
            <Image
              src="/logo.png"
              alt="شعار دعيدر للحلول البرمجية"
              fill
              sizes="36px"
              className="object-contain dark:hidden"
              priority
            />
            <Image
              src="/logo-light.png"
              alt="شعار دعيدر للحلول البرمجية"
              fill
              sizes="36px"
              className="object-contain hidden dark:block"
              priority
            />
          </div>
          <span className="hidden sm:block font-bold text-[#0f2744] dark:text-[#e8f0fb] text-sm leading-tight">
            {locale === 'ar' ? 'دعيدر للحلول البرمجية' : 'Daidar Solutions'}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                isActive(link.href)
                  ? 'text-[#38bdf8] bg-[#eff8ff] dark:bg-[#132038]'
                  : 'text-[#4a6080] dark:text-[#94b4d4] hover:text-[#0f2744] dark:hover:text-[#e8f0fb] hover:bg-[#f1f5f9] dark:hover:bg-[#1a2d48]'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg text-[#4a6080] dark:text-[#94b4d4] hover:text-[#38bdf8] dark:hover:text-[#38bdf8] hover:bg-[#f1f5f9] dark:hover:bg-[#1a2d48] transition-all duration-200"
            aria-label="تبديل المظهر / Toggle theme"
            id="theme-toggle-btn"
          >
            <Sun size={19} className="hidden dark:block text-amber-400" />
            <Moon size={19} className="block dark:hidden text-[#0f2744]" />
          </button>

          {/* Language Switch */}
          <Link
            href={localePath}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#4a6080] dark:text-[#94b4d4] hover:text-[#38bdf8] hover:bg-[#f1f5f9] dark:hover:bg-[#1a2d48] transition-all duration-200"
            aria-label={`Switch to ${otherLocale === 'ar' ? 'Arabic' : 'English'}`}
          >
            <Globe size={14} />
            <span>{t.lang.switchTo}</span>
          </Link>

          {/* CTA Button */}
          <Link
            href={`/${locale}/request`}
            className="hidden md:flex btn-primary text-sm py-2 px-4"
            id="nav-request-btn"
          >
            {t.nav.requestService}
          </Link>
          <Link href={`/${locale}/hub`} className="hidden sm:flex items-center gap-2 rounded-full border border-sky-500 px-4 py-2 text-sm font-bold text-[#0c3156] transition hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-slate-900"><Blocks size={17}/>{locale === 'ar' ? 'دعيدر هب' : 'Daidar Hub'}</Link>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#4a6080] dark:text-[#94b4d4] hover:bg-[#f1f5f9] dark:hover:bg-[#1a2d48] transition-colors"
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
          'md:hidden fixed inset-0 top-16 z-30 transition-all duration-300',
          isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        )}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-[#0f2744]/20 backdrop-blur-sm"
          onClick={() => setIsMenuOpen(false)}
        />
        {/* Menu Panel */}
        <div
          className={clsx(
            'relative bg-white dark:bg-[#0b1628] border-b border-[#e2e8f0] dark:border-[#1e3456] p-5 transition-transform duration-300',
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
                  'px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive(link.href)
                    ? 'text-[#38bdf8] bg-[#eff8ff] dark:bg-[#132038]'
                    : 'text-[#0f2744] dark:text-[#e8f0fb] hover:text-[#38bdf8] hover:bg-[#f8fafc] dark:hover:bg-[#1a2d48]'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Theme Toggle inside Mobile Menu */}
            <button
              type="button"
              onClick={toggleTheme}
              className="px-4 py-3 rounded-xl text-sm font-medium text-center flex items-center justify-center gap-2 border border-[#e2e8f0] dark:border-[#1e3456] text-[#0f2744] dark:text-[#e8f0fb] hover:bg-[#f8fafc] dark:hover:bg-[#1a2d48] transition-colors"
            >
              <span className="hidden dark:inline-flex items-center gap-2 text-amber-400">
                <Sun size={17} />
                <span className="text-[#0f2744] dark:text-[#e8f0fb]">{t.theme.toggleLight}</span>
              </span>
              <span className="inline-flex dark:hidden items-center gap-2 text-[#0f2744]">
                <Moon size={17} />
                <span>{t.theme.toggleDark}</span>
              </span>
            </button>

            <Link
              href={`/${locale}/request`}
              onClick={() => setIsMenuOpen(false)}
              className="btn-primary text-center"
            >
              {t.nav.requestService}
            </Link>
            <Link href={`/${locale}/hub`} onClick={() => setIsMenuOpen(false)} className="btn-secondary text-center"><Blocks size={17}/>{locale === 'ar' ? 'دعيدر هب' : 'Daidar Hub'}</Link>
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
