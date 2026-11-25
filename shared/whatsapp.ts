export const DAIDAR_SUPPORT_WHATSAPP = '201061532875';

/**
 * Normalizes a phone number into international digits for wa.me links.
 * Converts Arabic-Indic digits, strips punctuation/leading 00, and adds
 * Egypt country code (20) for local Egyptian mobile numbers (01xxxxxxxxx).
 * Returns null for missing or invalid numbers (never falls back to platform support).
 */
export function normalizeWhatsAppPhone(raw: unknown): string | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const ascii = String(raw)
    .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .trim();
  if (!ascii) return null;

  let digits = ascii.replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (/^01[0125]\d{8}$/.test(digits)) {
    digits = '20' + digits.slice(1);
  } else if (/^1[0125]\d{8}$/.test(digits)) {
    digits = '20' + digits;
  }
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return digits;
}

export function buildWhatsAppUrl(phone: unknown, text?: string): string | null {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) return null;
  const base = `https://wa.me/${normalized}`;
  const cleanText = typeof text === 'string' ? text.trim() : '';
  return cleanText ? `${base}?text=${encodeURIComponent(cleanText)}` : base;
}

export function buildDaidarSupportWhatsAppUrl(text?: string): string {
  return buildWhatsAppUrl(DAIDAR_SUPPORT_WHATSAPP, text)!;
}

/**
 * Builds a public storefront WhatsApp link strictly from the store's own phone.
 * Returns null when the merchant has no valid number (never falls back to Daidar).
 */
export function buildStoreWhatsAppUrl(storePhone: unknown, text?: string): string | null {
  return buildWhatsAppUrl(storePhone, text);
}
