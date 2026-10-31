# 02 — الهيكل التقني

الحالة: Done

## الهدف
تطبيق Electron مستقل داخل المستودع مع React وTypeScript وVite.

## المتطلبات
فصل main/preload/renderer/shared؛ SQLite مؤجل؛ عدم تحميل الموقع داخل نافذة Desktop.

## الملفات المتأثرة
desktop/daidar-flow/*، tsconfig.json، .gitignore

## خطوات التنفيذ
1. مراجعة المتطلبات والاعتماد على المهمة السابقة.
2. فصل main/preload/renderer/shared؛ SQLite مؤجل؛ عدم تحميل الموقع داخل نافذة Desktop.
3. فحص النتيجة وتسجيل الدليل قبل تحديث الحالة.

## معايير القبول
يُبنى التطبيق مستقلًا؛ تظل أوامر ومخرجات الموقع منفصلة.

## دليل التحقق
npm run build نجح: TypeScript + Vite + Electron main/preload bundles. الإصدارات مثبتة في lock مستقل. root tsconfig يستثني desktop ولا تغيرت dependencies الموقع.
