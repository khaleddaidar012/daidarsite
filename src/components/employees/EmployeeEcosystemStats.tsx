'use client'
import { useEffect, useState } from 'react'

const labels: Record<string, string> = { customers: 'الحسابات النشطة', stores: 'المتاجر', systems: 'اشتراكات الأنظمة', pending: 'طلبات قيد المراجعة', active: 'اشتراكات نشطة', expired: 'اشتراكات منتهية' }

export default function EmployeeEcosystemStats() {
  const [counts, setCounts] = useState<Record<string, number> | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  async function load() {
    setLoading(true); setError('')
    try { const response = await fetch('/api/employee/ecosystem-stats', { cache: 'no-store' }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'تعذر تحميل الإحصائيات'); setCounts(data.counts) }
    catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  return <section dir="rtl" className="rounded-2xl border bg-white p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold">إحصائيات دعيدر هب</h2><p className="mt-1 text-sm text-slate-500">ملخص أعداد الحسابات والمتاجر والاشتراكات.</p></div><button type="button" disabled={loading} onClick={() => void load()} className="rounded-xl border px-4 py-2 font-bold">تحديث</button></div>{error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}{loading?<p className="mt-5">جارٍ تحميل الإحصائيات…</p>:counts&&<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(labels).map(([key,label])=><article key={key} className="rounded-xl border bg-slate-50 p-5"><p className="text-sm text-slate-500">{label}</p><strong className="mt-2 block text-3xl text-sky-800">{(counts[key]||0).toLocaleString('ar-EG')}</strong></article>)}</div>}</section>
}
