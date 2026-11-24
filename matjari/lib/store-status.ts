import {storePlanName} from './subscription-plans';
export type StoreSubscription = { status?: string; start_date?: string | null; end_date?: string | null; plan_name?: string; price?: number | string; notes?: string } | null | undefined

export function freeStorePlanName(ar = true) {
  return ar ? 'الباقة المجانية' : 'Free Plan'
}

export function isPaidStoreSubscription(subscription: StoreSubscription): boolean {
  if (!subscription) return false
  if (subscription.status === 'awaiting_activation' || subscription.status === 'unsubscribed') return false
  const price = Number(subscription.price)
  return Number.isFinite(price) && price > 0
}

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

export function hasActivePaidSubscription(
  userActive: number | boolean | null | undefined,
  storeActive: number | boolean | null | undefined,
  subscription: StoreSubscription,
  now = Date.now()
): boolean {
  return isPaidStoreSubscription(subscription) && effectiveStoreStatus(userActive, storeActive, subscription, now) === 'active'
}

export function needsStoreUpgrade(
  userActive: number | boolean | null | undefined,
  storeActive: number | boolean | null | undefined,
  subscription: StoreSubscription,
  now = Date.now()
): boolean {
  return !hasActivePaidSubscription(userActive, storeActive, subscription, now)
}

export function displayStorePlan(subscription: StoreSubscription, ar = true) {
  if (!isPaidStoreSubscription(subscription)) return freeStorePlanName(ar)
  try{const notes=JSON.parse(subscription!.notes||'{}');if(Array.isArray(notes.features)&&notes.features.length)return storePlanName(notes.features,ar)}catch{}
  if(subscription!.plan_name?.includes('واتساب'))return storePlanName(['main_store','whatsapp_management'],ar);
  if(subscription!.plan_name?.includes('نسخ')||subscription!.plan_name?.includes('إشعارات'))return storePlanName(['main_store','backups'],ar);

  return storePlanName(['main_store'],ar);
}

export function serializeStoreSubscription<T extends Record<string, any>>(subscription: T | null | undefined, ar = true) {
  if (!subscription) return null
  const paid = isPaidStoreSubscription(subscription)
  return {
    ...subscription,
    plan_name: displayStorePlan(subscription, ar),
    is_paid: paid,
    plan_tier: paid ? ('paid' as const) : ('free' as const),
    start_date: paid ? (subscription.start_date ?? null) : null,
    end_date: paid ? (subscription.end_date ?? null) : null,
  }
}
