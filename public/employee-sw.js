self.addEventListener('push', event => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data?.text() || 'تأكيد الحضور مطلوب' } }
  event.waitUntil(self.registration.showNotification(data.title || 'دعيدر · تأكيد الحضور', {
    body: data.body || 'هل ما زلت تعمل؟',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: `attendance-${data.shift_id || 'check'}`,
    renotify: true,
    requireInteraction: true,
    actions: [
      { action: 'here', title: 'موجود · كمل' },
      { action: 'away', title: 'انصراف' },
    ],
    data: { shift_id: data.shift_id, stage: data.stage, url: '/employee' },
  }))
})

self.addEventListener('notificationclick', event => {
  const { action, notification } = event
  const payload = notification.data || {}
  notification.close()
  if (action === 'here' || action === 'away') {
    event.waitUntil((async () => {
      const response = await fetch('/api/employee/presence-response', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift_id: payload.shift_id, response: action }),
      })
      if (!response.ok) await self.registration.showNotification('تعذر حفظ الرد', { body: 'افتح صفحة دعيدر وسجّل ردك على تنبيه الحضور.', icon: '/logo.png', data: { url: '/employee' } })
    })())
    return
  }
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const target = windows.find(client => new URL(client.url).origin === self.location.origin)
    if (target) await target.focus()
    else await self.clients.openWindow(payload.url || '/employee')
  })())
})
