import type { Metadata, Viewport } from 'next'
import { Cairo, Inter } from 'next/font/google'
import '../styles/globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { VisitTracker } from '@/components/providers/VisitTracker'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://daidarsolutions.com'),
  title: {
    template: '%s | دعيدر للحلول البرمجية',
    default: 'دعيدر للحلول البرمجية | Daidar Solutions',
  },
  description:
    'دعيدر للحلول البرمجية — شريكك التقني لتطوير شغلك. نصمم مواقع إلكترونية، متاجر، أنظمة مخصصة وحلول SaaS احترافية.',
  keywords: [
    'دعيدر للحلول البرمجية',
    'Daidar Solutions',
    'تطوير مواقع',
    'متاجر إلكترونية',
    'أنظمة مخصصة',
    'SaaS',
    'web development',
    'custom systems',
    'e-commerce',
  ],
  authors: [{ name: 'Khaled Hesham' }],
  creator: 'Daidar Solutions',
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    alternateLocale: 'en_US',
    siteName: 'دعيدر للحلول البرمجية | Daidar Solutions',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('daidar-theme');
                if (stored === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.style.colorScheme = 'dark';
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.style.colorScheme = 'light';
                }
              } catch (e) {}

              try {
                if (typeof MutationObserver !== 'undefined') {
                  const observer = new MutationObserver((mutations) => {
                    for (const m of mutations) {
                      for (const node of m.addedNodes) {
                        if (
                          node.nodeType === 1 &&
                          (node.id?.includes('dz-') ||
                           node.className?.toString?.().includes('dz-container') ||
                           node.id?.includes('acjicnehenlkmfnfpbjbpfnjegbelbpj'))
                        ) {
                          node.remove();
                        }
                      }
                    }
                  });
                  observer.observe(document.documentElement, { childList: true, subtree: true });
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${cairo.variable} ${inter.variable} font-arabic antialiased bg-[#f8fafc] dark:bg-[#0b1628] text-[#0f2744] dark:text-[#e8f0fb] transition-colors duration-200`}
      >
        <ThemeProvider>
          <VisitTracker />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
