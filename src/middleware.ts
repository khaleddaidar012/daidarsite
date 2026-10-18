import { NextRequest, NextResponse } from 'next/server'

const locales = ['ar', 'en'] as const
const defaultLocale = 'ar'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip API routes, static files, and _next
  if (
    pathname.startsWith('/api') ||
    pathname === '/track' || pathname.startsWith('/track/') ||
    pathname === '/admin' || pathname.startsWith('/admin/') ||
    pathname === '/employee' || pathname.startsWith('/employee/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/sitemap') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next()
  }

  // Check if locale is already in pathname
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (pathnameHasLocale) return NextResponse.next()

  // Redirect to default locale
  const url = request.nextUrl.clone()
  url.pathname = `/${defaultLocale}${pathname === '/' ? '' : pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|logo.png|logo-light.png|robots.txt|sitemap.xml).*)'],
}
