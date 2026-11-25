export const STORE_THEME_IDS = ['classic', 'minimal', 'boutique', 'tech', 'catalog'] as const;
export type StoreThemeId = (typeof STORE_THEME_IDS)[number];
export const DEFAULT_STORE_THEME: StoreThemeId = 'classic';

export interface StoreThemeMeta {
  id: StoreThemeId;
  nameAr: string;
  nameEn: string;
  taglineAr: string;
  taglineEn: string;
  descriptionAr: string;
  descriptionEn: string;
  isDark: boolean;
  swatches: [string, string, string];
  layoutStyle: 'balanced' | 'editorial' | 'lookbook' | 'grid-dark' | 'dense-catalog';
}

export const STORE_THEMES: readonly StoreThemeMeta[] = [
  {
    id: 'classic',
    nameAr: 'كلاسيك واضح',
    nameEn: 'Clean Classic',
    taglineAr: 'متوازن وواضح لجميع الأنشطة',
    taglineEn: 'Balanced & clear for any store',
    descriptionAr: 'تخطيط متوازن بخلفيات فاتحة وتصنيفات وبحث بارز وكروت منتجات سهلة القراءة.',
    descriptionEn: 'Balanced light layout with visible categories, search, and easy-to-scan product cards.',
    isDark: false,
    swatches: ['#f7fafe', '#0084d6', '#0e1f38'],
    layoutStyle: 'balanced',
  },
  {
    id: 'minimal',
    nameAr: 'مينيمال هادئ',
    nameEn: 'Calm Minimal',
    taglineAr: 'مساحات واسعة وتركيز على الصورة',
    taglineEn: 'Airy spacing & product-first focus',
    descriptionAr: 'تصميم هادئ بمساحات بيضاء أوسع وتفاصيل أقل وصور منتجات بارزة وتدرج طباعي أنيق.',
    descriptionEn: 'Calm gallery layout with generous whitespace, bold photography, and refined typography.',
    isDark: false,
    swatches: ['#fafaf9', '#18181b', '#71717a'],
    layoutStyle: 'editorial',
  },
  {
    id: 'boutique',
    nameAr: 'بوتيك أنيق',
    nameEn: 'Editorial Boutique',
    taglineAr: 'طابع تحريري دافئ وإبراز للهوية',
    taglineEn: 'Warm editorial brand showcase',
    descriptionAr: 'ألوان دافئة وإطار تحريري يبرز هوية المتجر مع كروت عرض طولية جذابة للمنتجات.',
    descriptionEn: 'Warm ivory tones and framed editorial presentation with tall showcase product cards.',
    isDark: false,
    swatches: ['#fdf8f3', '#9a3412', '#292524'],
    layoutStyle: 'lookbook',
  },
  {
    id: 'tech',
    nameAr: 'تقني داكن',
    nameEn: 'Dark Tech',
    taglineAr: 'أسطح داكنة مريحة وتباين عالٍ',
    taglineEn: 'Crisp dark surfaces & high contrast',
    descriptionAr: 'واجهة داكنة متزنة بتفاصيل عملية وأسعار واضحة وتباين مريح للعين دون توهج مزعج.',
    descriptionEn: 'Balanced obsidian interface with crisp borders, clear pricing, and comfortable contrast.',
    isDark: true,
    swatches: ['#090d16', '#06b6d4', '#f8fafc'],
    layoutStyle: 'grid-dark',
  },
  {
    id: 'catalog',
    nameAr: 'كتالوج منظم',
    nameEn: 'Structured Catalog',
    taglineAr: 'تصفح سريع للمنتجات الكثيرة',
    taglineEn: 'Fast browsing for rich catalogs',
    descriptionAr: 'شريط بحث وتصنيفات منظمة بعدّاد منتجات وشبكة كثيفة تعرض الأسعار والطلب بسرعة.',
    descriptionEn: 'Search-first utility bar, category counters, and compact cards built for quick ordering.',
    isDark: false,
    swatches: ['#f1f5f9', '#059669', '#0f172a'],
    layoutStyle: 'dense-catalog',
  },
] as const;

export function isValidStoreThemeId(value: unknown): value is StoreThemeId {
  return typeof value === 'string' && (STORE_THEME_IDS as readonly string[]).includes(value);
}

export function resolveStoreThemeId(value: unknown): StoreThemeId {
  return isValidStoreThemeId(value) ? value : DEFAULT_STORE_THEME;
}

export function getStoreThemeMeta(value: unknown): StoreThemeMeta {
  const id = resolveStoreThemeId(value);
  return STORE_THEMES.find(theme => theme.id === id) || STORE_THEMES[0];
}
