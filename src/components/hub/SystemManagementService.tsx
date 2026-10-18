'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, ChevronRight, Clock3, Copy, CreditCard, Database, MessageCircle } from 'lucide-react'

const plans = [{ hours: 1, price: 800 }, { hours: 2, price: 1200 }, { hours: 3, price: 1600 }]
const paymentNumbers = { instapay: '01092912431', vodafone: '01061532875' }
type Method = keyof typeof paymentNumbers
type Payment = { hours: number; start: number; method: Method; readyAt: number }
const storageKey = 'daidar-system-management-payment-v1'

export default function SystemManagementService({ ar, onBack }: { ar: boolean; onBack: () => void }) {
  const [step, setStep] = useState<'service' | 'hours' | 'time' | 'payment'>('service')
  const [hours, setHours] = useState(1)
  const [start, setStart] = useState(18)
  const [method, setMethod] = useState<Method>('instapay')
  const [payment, setPayment] = useState<Payment | null>(null)
  const [now, setNow] = useState(0)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null') as Payment | null
      if (saved && plans.some(p => p.hours === saved.hours) && Number.isInteger(saved.start) && saved.start >= 18 && saved.start + saved.hours <= 24 && Object.prototype.hasOwnProperty.call(paymentNumbers, saved.method) && Number.isFinite(saved.readyAt) && saved.readyAt <= Date.now() + 120000) {
        setHours(saved.hours); setStart(saved.start); setMethod(saved.method); setPayment(saved); setStep('payment')
      }
    } catch { /* An unavailable browser store must not block checkout. */ }
    setNow(Date.now())
  }, [])
  useEffect(() => {
    if (!payment) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [payment])
  const price = plans.find(plan => plan.hours === hours)!.price
  const Arrow = ar ? ArrowLeft : ArrowRight
  const time = (hour: number) => hour === 24 ? (ar ? '١٢ منتصف الليل' : '12 midnight') : `${(hour - 12).toLocaleString(ar ? 'ar-EG' : 'en-US')} ${ar ? 'مساءً' : 'PM'}`
  const methodName = method === 'instapay' ? 'InstaPay' : (ar ? 'فودافون كاش' : 'Vodafone Cash')
  const remaining = payment ? Math.max(0, Math.ceil((payment.readyAt - now) / 1000)) : 120
  const ready = !!payment && now > 0 && remaining === 0
  const primary = 'inline-flex items-center justify-center gap-2 rounded-xl bg-sky-700 px-6 py-3 font-bold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700'
  const panel = 'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-8'
  function revise() { setPayment(null); setStep('time'); setCopied(false); try { sessionStorage.removeItem(storageKey) } catch {} }
  function checkout() {
    const next: Payment = { hours, start, method, readyAt: Date.now() + 120000 }
    setPayment(next); setNow(Date.now()); setStep('payment'); setCopied(false)
    try { sessionStorage.setItem(storageKey, JSON.stringify(next)) } catch {}
  }
  function whatsapp() {
    if (!ready || !payment) return
    const text = ar
      ? `السلام عليكم، اخترت خدمة إدارة السيستم من دعيدر هب.\nعدد الساعات: ${hours} ساعة يوميًا.\nالموعد المطلوب: من ${time(start)} إلى ${time(start + hours)} بتوقيت القاهرة.\nالباقة: ${price} جنيه شهريًا.\nوسيلة الدفع: ${methodName} على رقم ${paymentNumbers[method]}.\nتم الدفع، وسأرفق صورة التحويل هنا.\nبرجاء التواصل معي لتأكيد الموعد وبدء الخدمة.`
      : `Hello, I chose Daidar Hub system management.\nDaily hours: ${hours}.\nRequested time: ${time(start)} to ${time(start + hours)} (Cairo).\nPlan: EGP ${price} per month.\nPayment: ${methodName}, ${paymentNumbers[method]}.\nI have paid and will attach the transfer receipt here.\nPlease contact me to confirm the time and start the service.`
    window.location.href = `https://wa.me/201092912431?text=${encodeURIComponent(text)}`
  }
  return <section className="py-8">
    <button onClick={onBack} className="mb-7 inline-flex items-center gap-2 text-sm font-bold text-sky-700 dark:text-sky-300"><ChevronRight size={18} className={ar ? '' : 'rotate-180'} />{ar ? 'الأنظمة والخدمات' : 'Systems and services'}</button>
    <div className="mb-8"><p className="text-sm font-bold text-sky-700 dark:text-sky-300">{ar ? 'خدمات إدارة بيانات وأنظمة إلكترونية' : 'Data and digital system management'}</p><h1 className="mt-3 text-3xl font-black sm:text-4xl">{ar ? 'السيستم بتاعك شغال بتكلفة أقل.' : 'Keep your system running for less.'}</h1></div>
    {step === 'service' ? <article className={`${panel} max-w-2xl`}><span className="inline-flex rounded-2xl bg-sky-50 p-4 text-sky-600 dark:bg-sky-950"><Database size={30} /></span><h2 className="mt-6 text-2xl font-extrabold">{ar ? 'خدمة إدارة السيستم' : 'System management service'}</h2><p className="mt-3 leading-8 text-slate-500 dark:text-slate-400">{ar ? 'اختار عدد ساعات يومية لإدارة بياناتك ومتابعة السيستم، وحدد الوقت المناسب لشغلك.' : 'Choose daily hours to manage your data and system, at a time that suits your business.'}</p><p className="mt-5 font-bold text-sky-800 dark:text-sky-300">{ar ? 'باقات تبدأ من ٨٠٠ جنيه شهريًا' : 'Plans from EGP 800 per month'}</p><button className={`${primary} mt-7`} onClick={() => setStep('hours')}>{ar ? 'اختار الخدمة' : 'Choose service'}<Arrow size={18} /></button></article> : <>
      <ol aria-label={ar ? 'خطوات اختيار الخدمة' : 'Service checkout steps'} className="mb-6 grid grid-cols-3 gap-2 text-center text-sm font-bold">{(['hours', 'time', 'payment'] as const).map((key, index) => <li key={key} aria-current={step === key ? 'step' : undefined} className={`rounded-xl p-3 ${step === key ? 'bg-[#102f50] text-white' : 'bg-sky-50 text-sky-800 dark:bg-slate-800 dark:text-sky-200'}`}>{ar ? ['الساعات', 'الموعد', 'الدفع'][index] : ['Hours', 'Time', 'Payment'][index]}</li>)}</ol>
      {step === 'hours' && <div className={panel}><h2 className="text-2xl font-extrabold">{ar ? 'محتاج كام ساعة يوميًا؟' : 'How many hours per day?'}</h2><p className="mt-2 text-sm text-slate-500">{ar ? 'الأسعار التالية اشتراك شهري بالجنيه المصري.' : 'Monthly subscriptions in Egyptian pounds.'}</p><div className="my-7 grid gap-4 sm:grid-cols-3">{plans.map(plan => <button key={plan.hours} onClick={() => { setHours(plan.hours); if (start + plan.hours > 24) setStart(24 - plan.hours) }} aria-pressed={hours === plan.hours} className={`rounded-2xl border-2 p-6 text-start ${hours === plan.hours ? 'border-sky-500 bg-sky-50 dark:bg-sky-950' : 'border-slate-200 dark:border-slate-700'}`}><Clock3 className="text-sky-600" /><span className="mt-5 block text-xl font-extrabold">{plan.hours.toLocaleString(ar ? 'ar-EG' : 'en-US')} {ar ? (plan.hours === 1 ? 'ساعة يوميًا' : plan.hours === 2 ? 'ساعتان يوميًا' : 'ساعات يوميًا') : plan.hours === 1 ? 'hour daily' : 'hours daily'}</span><span className="mt-3 block text-3xl font-black">{plan.price.toLocaleString(ar ? 'ar-EG' : 'en-US')}</span><span className="text-sm text-slate-500">{ar ? 'جنيه / شهريًا' : 'EGP / month'}</span>{hours === plan.hours && <Check className="mt-3 text-sky-600" size={20}/>}</button>)}</div><div className="flex justify-between"><button onClick={() => setStep('service')}>{ar ? 'رجوع' : 'Back'}</button><button className={primary} onClick={() => setStep('time')}>{ar ? 'اختيار الموعد' : 'Choose time'}<Arrow size={18}/></button></div></div>}
      {step === 'time' && <div className={panel}><h2 className="text-2xl font-extrabold">{ar ? 'اختار ميعادك اليومي' : 'Choose your daily time'}</h2><p className="mt-3 text-sm leading-7 text-slate-500">{ar ? 'المواعيد من ٦ مساءً حتى ١٢ منتصف الليل بتوقيت القاهرة. اختار وقت بداية يناسب مدة باقتك.' : 'Available from 6 PM to midnight, Cairo time. Choose a start time that fits your plan.'}</p><div className="my-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 7 - hours }, (_, index) => 18 + index).map(hour => <button key={hour} aria-pressed={start === hour} onClick={() => setStart(hour)} className={`rounded-xl border-2 p-4 text-sm font-bold ${start === hour ? 'border-sky-500 bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-100' : 'border-slate-200 dark:border-slate-700'}`}>{ar ? 'من ' : ''}{time(hour)} {ar ? 'إلى' : 'to'} {time(hour + hours)}</button>)}</div><p className="rounded-xl bg-sky-50 p-4 text-sm font-bold text-sky-900 dark:bg-sky-950 dark:text-sky-100">{ar ? 'ملحوظة: وقت الصلاة لا يُخصم من الساعة.' : 'Note: prayer time is not deducted from your service hours.'}</p><fieldset className="mt-7"><legend className="font-bold">{ar ? 'وسيلة الدفع' : 'Payment method'}</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{(['instapay','vodafone'] as const).map(key => <label key={key} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${method === key ? 'border-sky-500 bg-sky-50 dark:bg-sky-950' : 'border-slate-200 dark:border-slate-700'}`}><input type="radio" name="service-payment-method" checked={method === key} onChange={() => setMethod(key)} />{key === 'instapay' ? 'InstaPay' : ar ? 'فودافون كاش' : 'Vodafone Cash'}</label>)}</div></fieldset><div className="mt-7 flex justify-between"><button onClick={() => setStep('hours')}>{ar ? 'رجوع' : 'Back'}</button><button className={primary} onClick={checkout}>{ar ? 'المتابعة للدفع' : 'Continue to payment'}<Arrow size={18}/></button></div></div>}
      {step === 'payment' && payment && <div className="grid items-start gap-5 lg:grid-cols-[1fr_340px]"><article className={panel}><h2 className="flex items-center gap-3 text-2xl font-extrabold"><CreditCard className="text-sky-600"/>{ar ? 'بيانات الدفع' : 'Payment details'}</h2><dl className="my-6 space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-slate-500">{ar ? 'الخدمة' : 'Service'}</dt><dd className="font-bold">{ar ? 'إدارة السيستم' : 'System management'}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">{ar ? 'الساعات اليومية' : 'Daily hours'}</dt><dd className="font-bold">{hours.toLocaleString(ar ? 'ar-EG' : 'en-US')}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">{ar ? 'الموعد المطلوب' : 'Requested time'}</dt><dd className="font-bold">{time(start)} – {time(start + hours)}</dd></div><div className="flex justify-between gap-3 border-t pt-4 dark:border-slate-700"><dt>{ar ? 'الاشتراك الشهري' : 'Monthly subscription'}</dt><dd className="text-xl font-black text-sky-700 dark:text-sky-300">{price.toLocaleString(ar ? 'ar-EG' : 'en-US')} {ar ? 'جنيه' : 'EGP'}</dd></div></dl><div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800"><p className="text-sm font-bold">{ar ? 'حوّل المبلغ عبر ' : 'Transfer using '}{methodName}</p><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><b dir="ltr" className="text-2xl tracking-wider">{paymentNumbers[method]}</b><button className="inline-flex items-center gap-2 text-sm font-bold text-sky-700 dark:text-sky-300" onClick={async()=>{try{await navigator.clipboard.writeText(paymentNumbers[method]);setCopied(true)}catch{setCopied(false)}}}><Copy size={16}/>{copied ? (ar ? 'تم النسخ' : 'Copied') : (ar ? 'نسخ الرقم' : 'Copy number')}</button></div></div><p className="mt-5 text-sm leading-7 text-slate-500">{ar ? 'بعد التحويل، ابعت تفاصيل اختيارك وصورة التحويل على واتساب. هنتواصل معاك لتأكيد الموعد وبدء الخدمة.' : 'After transferring, send your choices and receipt on WhatsApp. We will contact you to confirm the time and start the service.'}</p><button onClick={revise} className="mt-5 text-sm font-bold text-sky-700 underline dark:text-sky-300">{ar ? 'تعديل الساعات أو الموعد أو طريقة الدفع' : 'Edit hours, time, or payment method'}</button></article><aside className={`${panel} text-center`}><Clock3 className="mx-auto text-sky-600" size={32}/><h2 className="mt-4 font-extrabold">{ready ? (ar ? 'جاهز لإرسال التفاصيل' : 'Ready to send details') : (ar ? 'زر واتساب هيتاح بعد' : 'WhatsApp available in')}</h2><p role="timer" aria-label={ar ? 'الوقت المتبقي لإتاحة واتساب' : 'Time until WhatsApp is available'} dir="ltr" className="my-6 text-5xl font-black tabular-nums text-sky-700 dark:text-sky-300">{String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')}</p><button disabled={!ready} onClick={whatsapp} className={`${primary} w-full`}><MessageCircle size={20}/>{ar ? 'تم الدفع — إرسال التفاصيل' : 'Paid — send details'}</button><p className="mt-4 text-xs leading-6 text-slate-500">{ar ? 'يفتح واتساب برسالة جاهزة. أرفق صورة التحويل وأرسلها، وفريقنا هيتواصل معاك.' : 'Opens WhatsApp with a ready message. Attach the receipt and send it; our team will contact you.'}</p></aside></div>}
    </>}
  </section>
}
