# 10 — اختبار واجهة سطح المكتب

الحالة: Done

## الهدف
فحوص بناء وسياسة ميزات واختبارات Electron حقيقية بلا اتصال.

## المتطلبات
اختبار Splash والبطاقات والـIPC والروابط والمقاسات؛ حفظ لقطة محلية وتسجيل النتائج.

## الملفات المتأثرة
desktop/daidar-flow/tests، tasks/10-dashboard-testing.md

## خطوات التنفيذ
1. مراجعة المتطلبات والاعتماد على المهمة السابقة.
2. اختبار Splash والبطاقات والـIPC والروابط والمقاسات؛ حفظ لقطة محلية وتسجيل النتائج.
3. فحص النتيجة وتسجيل الدليل قبل تحديث الحالة.

## معايير القبول
كل اختبارات المرحلة ناجحة؛ لا Installer ولا وظائف داخلية؛ تقرير حدود التحقق.

## نتيجة التنفيذ — 2026-10-31
- بناء TypeScript + Vite + main/preload bundling: ناجح.
- 3 policy tests: عدد الميزات، رفض الطلبات المشوهة، allowlist الروابط: ناجحة.
- startup.cjs: تشغيل Electron45.2.1 native على Windows، Splash تغلق عند الجاهزية، sandbox/contextIsolation وNode isolation، المجاني والمقفول ورفض تزوير حالة الواجهة: ناجح.
- branding.cjs: Website/Facebook إلى shell.openExternal مع اعتراض الفتح أثناء الاختبار؛ URLs غير المعتمدة مرفوضة: ناجح.
- responsive.cjs: 1280/768/360px = 3/2/1 أعمدة؛ لا قص أفقي والتذييل ظاهر وTab يصل للأزرار: ناجح.
- dashboard.cjs: reload بدون إنترنت، كل الأفعال الثمانية، CSP ضد inline script، منع path traversal وpopups، عدم وجود remote requests أو JS errors، وإعادة محاولة فشل تهيئة مصطنع: ناجح.
- صور Desktop وTablet وNarrow محفوظة محليًا في desktop/daidar-flow/artifacts، وفُحص Desktop وNarrow بصريًا.

## حدود التحقق
الاختبارات Native في نوافذ مخفية، ولا تتصل بعميل أو قاعدة إنتاج. لم يُجرّب Installer أو Code Signing أو تحديث تلقائي أو SQLite أو تراخيص، فهي خارج المرحلة. اختبار links يعترض openExternal ولا يفتح المتصفح أو يختبر اتصال Facebook. فحص المقاسات آلي وبصري؛ تدقيق قارئ شاشة مستقل ما زال مستقبليًا.

## نهاية المرحلة
Task01–10 Done؛ Task11–18 Pending. التوقف هنا مقصود وفق طلب المستخدم.
