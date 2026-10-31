# 14 — التحقق والتفعيل

الحالة: Done

## الهدف والمتطلبات
تفعيل كود/ملف، ربط الجهاز، التحقق لكل طلب مدفوع في Main، صفحة الحالة ونسخ المعرف.

## الملفات المتأثرة
src/main/licensing/service.ts وstorage.ts، main.ts وpreload.ts، shared/contracts.ts، ActivationPanel.tsx

## خطوات التنفيذ
تحقق schema والتوقيع؛ رفض الجهاز الآخر؛ حفظ DPAPI ذري؛ IPC محدد ومتحقق من sender؛ استيراد ملف محدود16KiB؛ اختبار الاستعادة.

## معايير القبول ونتيجة الفحص
نجحت اختبارات service وElectron الحقيقي قبل15: تفعيل كود/ملف، clipboard، إعادة التشغيل، mismatch، الحجم والمفتاح غير المعتمد. لا bypass إنتاجي للاختبارات.

راجع [التقرير النهائي](../desktop/daidar-flow/PHASE2_REPORT.md) وحدود الحماية في LICENSING.md.
