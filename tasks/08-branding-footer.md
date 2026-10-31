# 08 — العلامة والتذييل

الحالة: Done

## الهدف
Developed by Daidar وروابط الشركة الفعلية.

## المتطلبات
نسخ الشعار الموجود؛ فتح Website وFacebook فقط عبر allowlist في Main.

## الملفات المتأثرة
desktop/daidar-flow/public، src/shared، src/renderer

## خطوات التنفيذ
1. مراجعة المتطلبات والاعتماد على المهمة السابقة.
2. نسخ الشعار الموجود؛ فتح Website وFacebook فقط عبر allowlist في Main.
3. فحص النتيجة وتسجيل الدليل قبل تحديث الحالة.

## معايير القبول
فتح خارجي آمن؛ لا URL تعسفي من Renderer؛ التذييل ثابت أسفل النافذة دون تغطية المحتوى.

## دليل التحقق
policy tests وbranding.cjs ناجحة. رابطا Website/Facebook مأخوذان من HUB_SETUP وFooter الموجود. الاختبار يعترض shell.openExternal ويتحقق من الوجهة دون فتح المواقع؛ روابط file وURLs التعسفية ترفض. الشعار الأصلي محلي. لا watermark لتجنب تزاحم الكروت.
