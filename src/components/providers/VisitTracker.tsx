'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
export function VisitTracker() {
  const pathname = usePathname()
  useEffect(() => {
    if (!/^\/(ar|en)(\/|$)/.test(pathname)) return
    try {
      let visitor = localStorage.getItem('daidar-visitor')
      if (!visitor) { visitor = crypto.randomUUID(); localStorage.setItem('daidar-visitor', visitor) }
      fetch('/api/visit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitor }), keepalive: true }).catch(() => {})
    } catch { /* Tracking must never interrupt the site. */ }
  }, [pathname])
  return null
}
