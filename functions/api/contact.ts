import { hash, sameOrigin, type Env } from '../lib/store'
import { recordAdminNotification } from '../lib/notifications'

const serviceLabels: Record<string, { ar: string; en: string }> = {
  website: { ar: 'موقع إلكتروني', en: 'Website' },
  ecommerce: { ar: 'متجر إلكتروني', en: 'E-Commerce Store' },
  system: { ar: 'نظام مخصص', en: 'Custom System' },
  saas: { ar: 'حل SaaS', en: 'SaaS Solution' },
  other: { ar: 'أخرى', en: 'Other' },
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validatePhone(phone: string): boolean {
  return /^[+\d\s\-()]{7,20}$/.test(phone)
}

function sanitize(str: string): string {
  return str.replace(/[<>]/g, '').trim().slice(0, 1000)
}

export const onRequestPost = async (context: {
  request: Request
  env: Env
}) => {
  const { request, env } = context
  if (!sameOrigin(request)) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })

  // Parse body
  let body: Record<string, string>
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { name, phone, email, service, description } = body
  if ([name, phone, email, service, description].some(value => typeof value !== 'string') || Object.values(body).some(value => typeof value !== 'string' || value.length > 5000)) {
    return new Response(JSON.stringify({ error: 'validation' }), { status: 422 })
  }

  // Validation
  const errors: Record<string, string> = {}
  if (!name || name.trim().length < 2) errors.name = 'Name must be at least 2 characters'
  if (!phone || !validatePhone(phone)) errors.phone = 'Invalid phone number'
  if (!email || !validateEmail(email)) errors.email = 'Invalid email address'
  if (!service) errors.service = 'Service is required'
  if (!description || description.trim().length < 20)
    errors.description = 'Description must be at least 20 characters'

  if (Object.keys(errors).length > 0) {
    return new Response(JSON.stringify({ error: 'validation', errors }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Honeypot / spam check
  if ((body as any).website_url) {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (env.DB) {
    const key = 'contact:' + await hash(request.headers.get('CF-Connecting-IP') || 'local') + ':' + Math.floor(Date.now() / 600000)
    try {
      await env.DB.prepare('INSERT INTO login_attempts VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1').bind(key, Date.now() + 600000).run()
      const row = await env.DB.prepare('SELECT attempts FROM login_attempts WHERE key = ?').bind(key).first<{ attempts: number }>()
      if ((row?.attempts || 0) > 3) return new Response(JSON.stringify({ error: 'too_many_requests' }), { status: 429 })
    } catch { return new Response(JSON.stringify({ error: 'server_error' }), { status: 503 }) }
  }

  const resendApiKey = env.RESEND_API_KEY
  const fromEmail = env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  const toEmail = env.RESEND_TO_EMAIL || 'khaledhesham012@gmail.com'

  if (!resendApiKey) {
    return new Response(
      JSON.stringify({ error: 'config_error', message: 'Email service not configured' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const serviceLabel = serviceLabels[service]?.ar || service
  const emailSubject = `طلب خدمة جديد: ${serviceLabel} — ${sanitize(name)}`

  const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; direction: rtl; background: #f9fafb; margin: 0; padding: 20px; }
    .card { background: #ffffff; border-radius: 12px; padding: 32px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1d61d5, #3b96f4); border-radius: 8px; padding: 24px; margin-bottom: 24px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; }
    .header p { color: #dbeffe; margin: 6px 0 0; font-size: 14px; }
    .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; font-weight: 600; }
    .value { font-size: 16px; color: #111827; margin-bottom: 20px; padding: 10px 14px; background: #f3f4f6; border-radius: 6px; }
    .service-badge { display: inline-block; background: #dbeffe; color: #1d61d5; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; }
    .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>🚀 طلب خدمة جديد</h1>
      <p>دعيدر للحلول البرمجية | Daidar Solutions</p>
    </div>
    
    <div class="label">الخدمة المطلوبة</div>
    <div class="value"><span class="service-badge">${serviceLabel}</span></div>
    
    <div class="label">الاسم</div>
    <div class="value">${sanitize(name)}</div>
    
    <div class="label">رقم الهاتف / واتساب</div>
    <div class="value">${sanitize(phone)}</div>
    
    <div class="label">البريد الإلكتروني</div>
    <div class="value">${sanitize(email)}</div>
    
    <div class="label">وصف المشروع</div>
    <div class="value" style="white-space: pre-wrap;">${sanitize(description)}</div>
    
    <div class="footer">
      تم إرسال هذا الطلب من موقع دعيدر للحلول البرمجية<br>
      ${new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}
    </div>
  </div>
</body>
</html>
  `.trim()

  const messageId = crypto.randomUUID()
  if (env.DB) {
    try {
      await env.DB.prepare('INSERT INTO messages VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(messageId, name.trim(), email.trim(), phone.trim(), service, description.trim(), Date.now(), 'pending').run()
    } catch { return new Response(JSON.stringify({ error: 'server_error' }), { status: 503 }) }
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': messageId,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: sanitize(email),
        subject: emailSubject,
        html: htmlContent,
      }),
    })

    if (!res.ok) {
      if (env.DB) await env.DB.prepare("UPDATE messages SET status = 'failed' WHERE id = ?").bind(messageId).run()
      const errData = await res.json().catch(() => ({}))
      return new Response(
        JSON.stringify({ error: 'email_failed', details: errData }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (env.DB) {
      try { await env.DB.prepare("UPDATE messages SET status = 'sent', created_at = ? WHERE id = ?").bind(Date.now(), messageId).run() }
      catch (error) { console.error('Email accepted but recording status failed', messageId, error) }
    }
    if (env.DB) await recordAdminNotification(env, { id: messageId, actor: sanitize(name), eventType: 'customer_message', title: 'رسالة عميل جديدة', detail: `${sanitize(name)} أرسل طلبًا بخصوص ${serviceLabel}`, target: 'messages' })
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'server_error', message: err?.message || 'Server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
