# دعيدر للحلول البرمجية | Daidar Solutions

موقع تعريفي احترافي مبني بـ Next.js 15 + TypeScript + Tailwind CSS.

لوحة الإدارة المحمية متاحة على `/admin` لإحصائيات الزوار والبريد وإضافة المشاريع. إعداد Cloudflare Pages وD1 موضح في [ADMIN_SETUP.md](ADMIN_SETUP.md).

## 🚀 التشغيل المحلي

### المتطلبات
- Node.js 18+
- npm 9+

### الخطوات

```bash
# 1. ادخل مجلد المشروع
cd daidar-solutions

# 2. انسخ ملف متغيرات البيئة
copy .env.example .env.local

# 3. عدّل .env.local وأضف مفتاح Resend
# RESEND_API_KEY=re_xxxxxxxxxxxx
# RESEND_FROM_EMAIL=noreply@yourdomain.com

# 4. ثبّت التبعيات
npm install

# 5. شغّل خادم التطوير
npm run dev
```

الموقع سيعمل على: http://localhost:3000
ويتحول تلقائيًا إلى: http://localhost:3000/ar

---

## 📁 هيكل الملفات المهمة

```
src/
├── app/
│   ├── [locale]/           # صفحات متعددة اللغات
│   │   ├── page.tsx        # الصفحة الرئيسية
│   │   ├── portfolio/      # صفحة الأعمال
│   │   └── request/        # صفحة طلب الخدمة
│   └── api/contact/        # API إرسال البريد
├── data/
│   └── projects.ts         # ← هنا تضيف مشاريع جديدة
├── locales/
│   ├── ar.ts               # الترجمة العربية
│   └── en.ts               # الترجمة الإنجليزية
└── components/             # المكونات
```

---

## ➕ إضافة مشروع جديد

افتح الملف: `src/data/projects.ts`

أضف كائنًا جديدًا في مصفوفة `projects`:

```typescript
{
  id: 'my-new-project',
  slug: 'my-new-project',
  category: 'website', // website | ecommerce | system | saas
  status: 'published', // published | draft
  titleAr: 'اسم المشروع بالعربية',
  titleEn: 'Project Name in English',
  descriptionAr: 'وصف مختصر بالعربية',
  descriptionEn: 'Short description in English',
  longDescriptionAr: 'وصف تفصيلي بالعربية...',
  longDescriptionEn: 'Detailed description in English...',
  technologiesAr: ['React', 'Node.js'],
  technologiesEn: ['React', 'Node.js'],
  featuresAr: ['ميزة 1', 'ميزة 2'],
  featuresEn: ['Feature 1', 'Feature 2'],
  image: null,   // أو مسار الصورة: '/projects/my-project.jpg'
  link: null,    // أو رابط الموقع: 'https://example.com'
  order: 4,      // ترتيب العرض
}
```

لإخفاء مشروع مؤقتًا: غيّر `status: 'draft'`

---

## 🔑 متغيرات البيئة

| المتغير | الوصف | مطلوب |
|---------|-------|--------|
| `RESEND_API_KEY` | مفتاح Resend API | ✅ |
| `RESEND_FROM_EMAIL` | عنوان المرسل (يحتاج توثيق نطاق) | ✅ |
| `RESEND_TO_EMAIL` | البريد المستقبِل (افتراضي: khaledhesham012@gmail.com) | اختياري |
| `NEXT_PUBLIC_SITE_URL` | عنوان الموقع للإنتاج | اختياري |

### إعداد Resend

1. اذهب إلى [resend.com](https://resend.com) وأنشئ حسابًا
2. احصل على API Key من لوحة التحكم
3. لإرسال من نطاقك الخاص: وثّق النطاق في قسم Domains
4. للتجربة محليًا: يمكن استخدام `onboarding@resend.dev` كعنوان مرسل

---

## 🌐 النشر على Vercel

```bash
# ثبّت Vercel CLI
npm install -g vercel

# سجّل الدخول
vercel login

# انشر
vercel --prod
```

أضف متغيرات البيئة في لوحة تحكم Vercel:
`Settings → Environment Variables`

---

## 🎨 تخصيص الألوان

في `tailwind.config.js`، عدّل كائن `brand` لتغيير لوح الألوان:

```javascript
brand: {
  500: '#3b96f4', // اللون الأساسي
  600: '#2577e8', // للأزرار
  // ...
}
```

---

## 📧 اختبار نموذج التواصل

بدون RESEND_API_KEY، سيُرجع API خطأ 500.
للاختبار:
1. أضف `.env.local` بمفتاح Resend صحيح
2. ارسل طلبًا من صفحة `/ar/request`
3. تحقق من البريد: khaledhesham012@gmail.com

---

## ♿ إمكانية الوصول

- دعم كامل للتنقل بلوحة المفاتيح
- وسوم ARIA على جميع العناصر التفاعلية
- تباين ألوان يلبي معيار WCAG AA
- دعم `prefers-reduced-motion`
- معالم HTML5 دلالية
