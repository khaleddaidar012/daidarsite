'use client'
import { useEffect, useState } from 'react'

export default function ChatUnreadBadge({ scope = 'admin', className = '' }: { scope?: 'admin' | 'employee'; className?: string }) {
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    let alive = true, version = 0
    async function refresh() {
      const request = ++version
      try {
        const response = await fetch(`/api/${scope}/chat`, { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json() as { threads: { unread: number }[] }
        if (alive && request === version) setUnread(data.threads.reduce((sum, thread) => sum + thread.unread, 0))
      } catch { /* Keep the last known count during a connection interruption. */ }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 5000)
    window.addEventListener('staff-chat-read', refresh)
    window.addEventListener('focus', refresh)
    return () => { alive = false; window.clearInterval(timer); window.removeEventListener('staff-chat-read', refresh); window.removeEventListener('focus', refresh) }
  }, [scope])
  return unread > 0 ? <span className={`inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white ${className}`} aria-label={`${unread} رسالة غير مقروءة`}>{unread > 99 ? '99+' : unread.toLocaleString('ar-EG')}</span> : null
}
