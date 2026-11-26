import Link from 'next/link'
import Image from 'next/image'
import { MessageCircle, Mail, Facebook, Instagram } from 'lucide-react'
import { getTranslations } from '@/locales'
import type { Locale } from '@/types'

interface FooterProps {
  locale: Locale
}

export function Footer({ locale }: FooterProps) {
  const t = getTranslations(locale)
  const isRTL = locale === 'ar'
  const currentYear = new Date().getFullYear()

  const navLinks = [
    { href: `/${locale}`, label: t.nav.home },
    { href: `/${locale}#services`, label: t.nav.services },
    { href: `/${locale}/portfolio`, label: t.nav.portfolio },
    { href: `/${locale}/articles`, label: t.nav.articles },
    { href: `/${locale}/request`, label: t.nav.requestService },
  ]

  return (
    <footer className="bg-[#0f2744] text-white">
      {/* Main Footer */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* Brand Column */}
          <div className="space-y-4">
            <Link href={`/${locale}`} className="flex items-center gap-2.5 group">
              <div className="relative w-9 h-9 flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
                <Image
                  src="/logo-light.png"
                  alt="شعار دعيدر للحلول البرمجية"
                  fill
                  sizes="36px"
                  className="object-contain"
                />
              </div>
              <span className="font-bold text-white text-sm">
                {locale === 'ar' ? 'دعيدر للحلول البرمجية' : 'Daidar Solutions'}
              </span>
            </Link>
            <p className="text-[#94b4d4] text-sm leading-relaxed max-w-xs">
              {t.footer.tagline}
            </p>

            {/* Social Media Badges */}
            <div className="flex items-center gap-2.5 pt-2">
              <a
                href="https://www.facebook.com/daidarsoluations/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#94b4d4] hover:text-white hover:bg-[#1877F2] hover:border-[#1877F2] transition-all duration-200"
                aria-label="Facebook: daidarsoluations"
                title="Facebook"
              >
                <Facebook size={17} />
              </a>
              <a
                href="https://www.instagram.com/daidarsolutions"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#94b4d4] hover:text-white hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] hover:border-transparent transition-all duration-200"
                aria-label="Instagram: @daidarsolutions"
                title="Instagram"
              >
                <Instagram size={17} />
              </a>
              <a
                href="https://wa.me/201061532875"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#94b4d4] hover:text-white hover:bg-[#25D366] hover:border-[#25D366] transition-all duration-200"
                aria-label="WhatsApp"
                title="WhatsApp"
              >
                <MessageCircle size={17} />
              </a>
              <a
                href="mailto:khaledhesham012@gmail.com"
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#94b4d4] hover:text-white hover:bg-[#38bdf8] hover:border-[#38bdf8] transition-all duration-200"
                aria-label="Email"
                title="Email"
              >
                <Mail size={17} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-white text-sm mb-4">{t.footer.links.title}</h3>
            <ul className="space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[#94b4d4] hover:text-[#38bdf8] transition-colors duration-200 text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-white text-sm mb-4">{t.footer.contact.title}</h3>
            <div className="space-y-3">
              <a
                href="https://wa.me/201061532875"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-[#94b4d4] hover:text-[#38bdf8] transition-colors duration-200 text-sm group"
              >
                <MessageCircle size={16} className="text-[#25D366] flex-shrink-0" />
                <span>+20 106 153 2875</span>
              </a>
              <a
                href="mailto:khaledhesham012@gmail.com"
                className="flex items-center gap-3 text-[#94b4d4] hover:text-[#38bdf8] transition-colors duration-200 text-sm group"
              >
                <Mail size={16} className="text-[#38bdf8] flex-shrink-0" />
                <span>khaledhesham012@gmail.com</span>
              </a>
              <a
                href="https://www.facebook.com/daidarsoluations/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-[#94b4d4] hover:text-[#38bdf8] transition-colors duration-200 text-sm group"
              >
                <Facebook size={16} className="text-[#1877F2] flex-shrink-0" />
                <span>Facebook / daidarsoluations</span>
              </a>
              <a
                href="https://www.instagram.com/daidarsolutions"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-[#94b4d4] hover:text-[#38bdf8] transition-colors duration-200 text-sm group"
              >
                <Instagram size={16} className="text-[#E4405F] flex-shrink-0" />
                <span>Instagram / @daidarsolutions</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#5a7a9a]">
          <p>
            © {currentYear} {t.footer.company}. {t.footer.rights}.
          </p>
          <p>
            {locale === 'ar' ? 'مبني بتقنيات حديثة' : 'Built with modern technologies'}
          </p>
        </div>
      </div>
    </footer>
  )
}
