export const BASIC_MONTHLY_PRICE = 35000
export const BASIC_ACTIVITIES = [
  { id: 'supermarket', ar: 'سوبرماركت وبقالة', en: 'Supermarket & grocery' },
  { id: 'pharmacy', ar: 'صيدلية', en: 'Pharmacy' },
  { id: 'restaurant', ar: 'مطعم وكافيه', en: 'Restaurant & cafe' },
  { id: 'clothing', ar: 'ملابس وأحذية', en: 'Clothes & shoes' },
  { id: 'electronics', ar: 'أجهزة وإلكترونيات', en: 'Electronics' },
  { id: 'general', ar: 'محل تجاري / نشاط آخر', en: 'General store / other' },
]
export function normalizeTransferPhone(value: string) {
  return value.replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632)).replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776)).trim()
}
export function validTransferPhone(value: string) { return /^01\d{9}$/.test(value) }
