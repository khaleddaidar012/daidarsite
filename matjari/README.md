# متجري (Matjari) - منصة المتاجر الإلكترونية السحابية

منصة تجارة إلكترونية متعددة المتاجر (Multi-Tenant Store Platform) مدمجة مع قاعدة بيانات **Cloudflare D1** وبوابات طلبات الواتساب المباشرة.

---

## 📁 هيكل المشروع داخل المستودع
- `src/`: واجهات التطبيق (React + TypeScript + Tailwind CSS).
  - لوحة تحكم التاجر (Merchant Dashboard).
  - لوحة تحكم السوبر أدمن (Super Admin Dashboard).
  - واجهة المتجر العامة للزبائن (Public Storefront).
  - مسار الطلب عبر الواتساب وسلة الشراء.
- `functions/api/[[route]].ts`: دوال الباك إند السحابية على **Cloudflare Pages Functions** مع ربط قاعدة بيانات **D1**.
- `migrations/0001_initial_schema.sql`: جداول قاعدة البيانات (المتاجر، المستخدمين، المنتجات، الاشتراكات، الإحصائيات).
- `vite.config.ts`: خادم التطوير المحلي مع محاكاة كاملة لـ Cloudflare D1 عبر SQLite محلي.
- `wrangler.jsonc`: إعدادات النشر على Cloudflare Pages مع ربط D1.

---

## 🚀 التشغيل المحلي (Local Development)
```bash
cd matjari
npm install
npm run dev
```
يعمل التطبيق افتراضياً على:
`http://localhost:5173/daidarsoluations/ar/new_test_store/`

---

## ☁️ النشر على Cloudflare Pages (Deployment)
1. في لوحة تحكم Cloudflare، أنشئ مشروع Pages جديد واربطه بهذا المستودع.
2. حدد إعدادات البناء:
   - **Root directory:** `matjari`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. اربط قاعدة بيانات D1 في إعدادات Pages:
   - **Settings -> Functions -> D1 database bindings**
   - **Variable name:** `DB`
   - **Database:** اختر قاعدة بيانات D1 الخاصة بك.
4. نفذ المايجريشن:
   ```bash
   npx wrangler d1 execute <database_name> --file=migrations/0001_initial_schema.sql
   ```
5. ضع رابط النشر الناتج (مثال: `https://matjari.yourdomain.com`) في متغير بيئة الموقع الرئيسي:
   `NEXT_PUBLIC_MATJARI_URL=https://matjari.yourdomain.com/`

## المعاينة المستقلة
- مشروع Pages: daidar-matjari-preview، فرع feature/matjari-hub، مجلد البناء matjari.
- الرابط: https://daidar-matjari-preview.pages.dev/
- قاعدة D1 مستقلة: matjari-preview. لم يتم إنشاء الحساب الافتراضي admin123 في قاعدة المعاينة.
- READ_ONLY_PREVIEW=true يقصر API على قراءة الكتالوج فقط؛ الإدارة والطلبات والتسجيل مقفولة حتى إضافة جلسات وصلاحيات موثوقة على الخادم.
- بناء Vite يستخدم / للنشر؛ المسار المحلي القديم يظل للتطوير فقط.
- متغير NEXT_PUBLIC_MATJARI_URL يُضبط في بيئة Preview لمشروع daidarsite2 فقط.
