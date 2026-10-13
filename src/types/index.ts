export interface Project {
  managed?: boolean
  id: string
  slug: string
  category: 'website' | 'ecommerce' | 'system' | 'saas'
  status: 'published' | 'draft'
  titleAr: string
  titleEn: string
  descriptionAr: string
  descriptionEn: string
  longDescriptionAr: string
  longDescriptionEn: string
  technologiesAr: string[]
  technologiesEn: string[]
  featuresAr: string[]
  featuresEn: string[]
  image: string | null
  link: string | null
  order: number
}

export type Locale = 'ar' | 'en'

export interface ServiceRequest {
  name: string
  phone: string
  email: string
  service: string
  description: string
}

export type ServiceId = 'website' | 'ecommerce' | 'system' | 'saas' | ''
