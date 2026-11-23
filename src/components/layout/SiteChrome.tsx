'use client'
import { usePathname } from 'next/navigation'
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (/^\/(ar|en)\/hub(?:\/|$)/.test(pathname) || /^\/s\/[a-z0-9-]+\/?$/.test(pathname)) return null
  return <>{children}</>
}
