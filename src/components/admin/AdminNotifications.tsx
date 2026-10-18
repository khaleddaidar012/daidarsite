'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, BellRing, Blocks, CheckCheck, FolderKanban, LayoutDashboard, Mail, Users, X } from 'lucide-react'

type Target = 'overview' | 'projects' | 'employees' | 'messages' | 'hub'
type Item = { id: string; actor: string; event_type: string; title: string; detail: string; target: Target; created_at: number; read_at: number | null }
const icons = { overview: LayoutDashboard, projects: FolderKanban, employees: Users, messages: Mail, hub: Blocks }

export default function AdminNotifications({ onNavigate }: { onNavigate: (section: Target) => void }) {
  const [items, setItems] = useState<Item[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy,setBusy]=useState(false)
  const [toasts, setToasts] = useState<Item[]>([])
  const known = useRef<Set<string> | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/notifications', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'تعذر تحميل الإشعارات')
      const next = data.notifications as Item[]
      if (known.current) {
        const fresh = next.filter(item => !known.current!.has(item.id)).slice(0, 3)
        if (fresh.length) setToasts(current => [...fresh.reverse(), ...current].slice(0, 4))
      }
      known.current = new Set(next.map(item => item.id))
      setItems(next); setUnread(data.unread); setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر تحميل الإشعارات') }
  }, [])

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 12000)
    return () => window.clearInterval(timer)
  }, [load])
  useEffect(() => {
    if (!toasts.length) return
    const timer = window.setTimeout(() => setToasts(current => current.slice(1)), 7000)
    return () => window.clearTimeout(timer)
  }, [toasts])

  async function markRequest(body:unknown){
    const response=await fetch('/api/admin/notifications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    const data=await response.json().catch(()=>({error:'تعذر تحديث الإشعارات'}))
    if(!response.ok)throw Error(data.error||'تعذر تحديث الإشعارات')
  }
  async function markRead(item: Item) {
    setBusy(true)
    try{
      if(!item.read_at){await markRequest({id:item.id});setItems(current=>current.map(row=>row.id===item.id?{...row,read_at:Date.now()}:row));setUnread(count=>Math.max(0,count-1))}
      setError('');setToasts(current=>current.filter(row=>row.id!==item.id));setOpen(false);onNavigate(item.target)
    }catch(cause){setError(cause instanceof Error?cause.message:'تعذر تحديث الإشعارات')}
    finally{setBusy(false)}
  }
  async function markAllRead(){
    setBusy(true)
    try{await markRequest({all:true});setItems(current=>current.map(item=>({...item,read_at:item.read_at||Date.now()})));setUnread(0);setError('')}
    catch(cause){setError(cause instanceof Error?cause.message:'تعذر تحديث الإشعارات')}
    finally{setBusy(false)}
  }

  return <>
    <div className="admin-notifications relative">
      <button type="button" className="admin-notification-bell" aria-label={`الإشعارات${unread ? `، ${unread} غير مقروء` : ''}`} aria-expanded={open} onClick={() => setOpen(value => !value)}>
        {unread ? <BellRing size={18} /> : <Bell size={18} />}{unread > 0 && <span className="admin-notification-badge">{unread > 99 ? '٩٩+' : unread.toLocaleString('ar-EG')}</span>}
      </button>
      {open && <>
        <button aria-label="إغلاق قائمة الإشعارات" className="admin-notification-backdrop" onClick={() => setOpen(false)} />
        <section className="admin-notification-panel" aria-label="الإشعارات" dir="rtl">
          <header><div><strong>الإشعارات</strong><span>{error?'تعذر التحديث':unread ? `${unread.toLocaleString('ar-EG')} غير مقروءة` : 'كل شيء محدث'}</span></div><button type="button" aria-label="إغلاق" onClick={() => setOpen(false)}><X size={18} /></button></header>
          {!!unread && <button type="button" disabled={busy} className="admin-notification-mark-all" onClick={markAllRead}><CheckCheck size={15} /> تمييز الكل كمقروء</button>}
          {error && <p className="admin-notification-error">{error}<button type="button" disabled={busy} onClick={()=>void load()} className="mt-2 block font-bold underline">إعادة المحاولة</button></p>}
          <div className="admin-notification-list">
            {items.map(item => { const Icon = icons[item.target] || Bell; return <button type="button" key={item.id} disabled={busy} className={`admin-notification-item ${item.read_at ? '' : 'unread'}`} onClick={() => void markRead(item)}><span className="admin-notification-icon"><Icon size={17} /></span><span className="admin-notification-copy"><strong>{item.title}</strong><span>{item.detail}</span><time>{new Date(item.created_at).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' })}</time></span>{!item.read_at && <i aria-label="غير مقروء" />}</button> })}
            {!items.length && !error && <div className="admin-notification-empty"><Bell size={24} /><strong>مفيش إشعارات لسه</strong><span>هنبلغك هنا لما يحصل نشاط جديد.</span></div>}
          </div>
        </section>
      </>}
    </div>
    <div className="admin-toast-stack" aria-live="polite" aria-relevant="additions">
      {toasts.map(item => { const Icon = icons[item.target] || Bell; return <article key={item.id} className="admin-toast"><span className="admin-notification-icon"><Icon size={18} /></span><button type="button" className="admin-toast-content" onClick={() => void markRead(item)}><strong>{item.title}</strong><span>{item.detail}</span><small>دلوقتي</small></button><button type="button" aria-label="إغلاق التنبيه" className="admin-toast-close" onClick={() => setToasts(current => current.filter(row => row.id !== item.id))}><X size={16} /></button></article> })}
    </div>
  </>
}
