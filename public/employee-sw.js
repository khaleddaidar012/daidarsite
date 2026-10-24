self.addEventListener('push', event => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data?.text() || 'تأكيد الحضور مطلوب' } }
  const tag = `attendance-${data.shift_id || 'check'}`
  event.waitUntil((async () => {
    await self.registration.showNotification(data.title || 'دعيدر · تأكيد الحضور', {
      body: data.body || 'هل ما زلت تعمل؟',
      icon: '/employee-icon-192.png',
      badge: '/employee-icon-192.png',
      tag,
      renotify: true,
      requireInteraction: true,
      actions: [
        { action: 'here', title: 'موجود · كمل' },
        { action: 'away', title: 'انصراف' },
      ],
      data: { shift_id: data.shift_id, stage: data.stage, url: '/employee' },
    })
    await new Promise(resolve => setTimeout(resolve, 60000))
    const notifications = await self.registration.getNotifications({ tag })
    notifications.forEach(notification => notification.close())
  })())
})

self.addEventListener('message', event => {
  if (event.data?.type !== 'show-attendance-test') return
  const stage = Math.min(3, Math.max(1, Number(event.data.stage) || 1))
  const tag = `attendance-test-${stage}`
  event.waitUntil((async () => {
    await self.registration.showNotification(`اختبار تأكيد الحضور · التنبيه ${stage}`, {
      body: 'اختبار فقط — اختر «موجود · كمل» أو «انصراف». لن يتغير سجل الحضور أو المرتب.',
      icon: '/employee-icon-192.png',
      badge: '/employee-icon-192.png',
      tag,
      renotify: true,
      requireInteraction: true,
      actions: [
        { action: 'here', title: 'موجود · كمل' },
        { action: 'away', title: 'انصراف' },
      ],
      data: { test: true, stage, url: '/employee' },
    })
    await new Promise(resolve => setTimeout(resolve, 60000))
    const notifications = await self.registration.getNotifications({ tag })
    notifications.forEach(notification => notification.close())
  })())
})

self.addEventListener('notificationclick', event => {
  const { action, notification } = event
  const payload = notification.data || {}
  notification.close()
  if (payload.test === true) {
    event.waitUntil((async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const target = windows.find(client => { const url = new URL(client.url); return url.origin === self.location.origin && url.pathname.startsWith('/employee') })
      const result = { type: 'employee-notification-test-response', stage: payload.stage, response: action === 'here' || action === 'away' ? action : 'opened' }
      if (target) {
        target.postMessage(result)
        await target.focus()
      } else {
        const query = new URLSearchParams({ notificationTest: String(payload.stage || 1), response: result.response })
        await self.clients.openWindow(`/employee?${query.toString()}`)
      }
    })())
    return
  }
  if (action === 'away') {
    event.waitUntil((async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const target = windows.find(client => { const url = new URL(client.url); return url.origin === self.location.origin && url.pathname.startsWith('/employee') })
      if (target) {
        target.postMessage({ type: 'employee-checkout-request', shift_id: payload.shift_id })
        await target.focus()
      } else {
        const query = new URLSearchParams({ checkoutRequest: String(payload.shift_id || '') })
        await self.clients.openWindow(`/employee?${query.toString()}`)
      }
    })())
    return
  }
  if (action === 'here') {
    event.waitUntil((async () => {
      const response = await fetch('/api/employee/presence-response', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift_id: payload.shift_id, response: 'here' }),
      })
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        if (result.requires_checkout_report && result.shift_id) {
          const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
          const target = windows.find(client => { const url = new URL(client.url); return url.origin === self.location.origin && url.pathname.startsWith('/employee') })
          if (target) {
            target.postMessage({ type: 'employee-checkout-request', shift_id: result.shift_id })
            await target.focus()
          } else {
            const query = new URLSearchParams({ checkoutRequest: String(result.shift_id) })
            await self.clients.openWindow(`/employee?${query.toString()}`)
          }
        } else {
          await self.registration.showNotification('تعذر حفظ الرد', { body: 'افتح صفحة دعيدر وسجّل ردك على تنبيه الحضور.', icon: '/employee-icon-192.png', data: { url: '/employee' } })
        }
      }
    })())
    return
  }
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const target = windows.find(client => { const url = new URL(client.url); return url.origin === self.location.origin && url.pathname.startsWith('/employee') })
    if (target) await target.focus()
    else await self.clients.openWindow(payload.url || '/employee')
  })())
})
