'use client'
import { useEffect, useState } from 'react'
import { Clock3, MapPin } from 'lucide-react'

const clockFormat = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
const dateFormat = new Intl.DateTimeFormat('ar-EG', { timeZone: 'Africa/Cairo', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export default function AdminClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [])
  const parts = now ? clockFormat.formatToParts(now) : []
  const value = (type: string) => parts.find(p => p.type === type)?.value || '—'
  return <aside className="admin-clock" aria-label="الساعة بتوقيت دمياط">
    <div className="admin-clock-heading"><span><Clock3 size={15} /> الوقت دلوقتي</span><span className="admin-clock-live"><i /> مباشر</span></div>
    <time dateTime={now?.toISOString()} className="admin-clock-digits" dir="ltr" aria-label={now ? clockFormat.format(now) : 'جارٍ تحميل الساعة'}><span>{value('hour')}</span><b>:</b><span>{value('minute')}</span><span className="admin-clock-seconds">{value('second')}</span></time>
    <div className="admin-clock-period">{now ? value('dayPeriod') === 'AM' ? 'صباحًا' : 'مساءً' : '—'}</div>
    <div className="admin-clock-date">{now ? dateFormat.format(now) : 'جارٍ تحميل التاريخ…'}</div>
    <div className="admin-clock-location"><MapPin size={12} /> دمياط، مصر <span>12 ساعة</span></div>
  </aside>
}
