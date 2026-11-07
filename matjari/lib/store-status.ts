export type StoreSubscription = { status?: string; start_date?: string | null; end_date?: string | null; plan_name?: string; price?: number | string } | null | undefined

function dayStart(value: string | null | undefined) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? Date.parse(`${value}T00:00:00.000Z`) : Number.NaN
}

function dayEnd(value: string | null | undefined) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? Date.parse(`${value}T23:59:59.999Z`) : Number.NaN
}

export function effectiveStoreStatus(userActive: number | boolean | null | undefined, storeActive: number | boolean | null | undefined, subscription: StoreSubscription, now = Date.now()): string {
  if (userActive === 0 || userActive === false) return 'suspended'
  if (storeActive !== 1 && storeActive !== true) return 'awaiting_activation'
  if (!subscription) return 'unsubscribed'
  if (!['active', 'trial'].includes(subscription.status || '')) return subscription.status || 'unsubscribed'
  const start = dayStart(subscription.start_date)
  const end = dayEnd(subscription.end_date)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'awaiting_activation'
  if (start > now) return 'scheduled'
  if (end < now) return 'expired'
  return subscription.status || 'active'
}

export function storeIsAvailable(status: string) {
  return status === 'active' || status === 'trial'
}

export function displayStorePlan(subscription: StoreSubscription) {
  if (!subscription) return 'غير محدد'
  if (subscription.plan_name && subscription.plan_name !== 'بانتظار التفعيل') return subscription.plan_name
  if (Number(subscription.price || 0) === 0) return 'اشتراك مجاني'
  return 'اشتراك المتجر'
}
