# دعيدر فلو — Daidar Flow

واجهة Windows Desktop مستقلة، Offline First، مرحلة Task01–10. هذه واجهة منتج أولية وليست نظام بيع جاهزًا: الكروت الأساسية تعرض قريبًا والمدفوعة تبقى مقفلة في Main. لا بيانات عملاء أو وظائف مخزون أو قاعدة مبيعات أو تراخيص أو دفع.

## التشغيل من جذر المستودع

المتطلبات: Windows10/11 x64 وNode22.12+ أو Node24 LTS.

```powershell
npm --prefix desktop/daidar-flow ci
npm --prefix desktop/daidar-flow start
```

التثبيت الأول يحتاج إنترنت لتنزيل حزم التطوير وElectron. Electron45 قد ينزل runtime في أول تشغيل؛ يمكن تجهيزه مسبقًا عبر `node desktop/daidar-flow/node_modules/electron/install.js`. بعد تجهيز runtime والبناء، ملفات التطبيق والشعار وخط Cairo محلية ولا تحتاج اتصالًا لفتح الواجهة. لا تشغّل نسخة الموقع داخل Electron.

## التحقق

```powershell
npm --prefix desktop/daidar-flow run build
npm --prefix desktop/daidar-flow test
```

الاختبارات تستخدم Electron حقيقيًا بنوافذ مخفية وتغلقه بعدها. يحتاج تشغيل subprocesses مسموحًا على Windows؛ sandbox التطبيق نفسه يبقى فعالًا. تُحفظ صور الواجهة في artifacts/ المحلي المستثنى من Git. لا يفتح اختبار branding المتصفح الخارجي فعلًا؛ يعترض النداء ويتحقق من الرابط.

## البنية والنطاق

- src/main: lifecycle، تحميل محلي عبر daidar://app، تحقق sender للـIPC، رفض التنقل وpopups، سياسة الميزات وفتح روابط محددة فقط.
- src/main/preload.ts: bridge صغيرة typed؛ لا كشف ipcRenderer أو filesystem.
- src/renderer: React RTL، ثمانية كروت ورسائل حالة، CSS متجاوب وخط Cairo محلي.
- src/shared: عقود البيانات و3 ميزات مجانية و5 مدفوعة وقائمة روابط الشركة.
- public: الشعار الأصلي وSplash HTML/CSS.
- tests: policy/native/UI/offline/responsive.

راجع [خطة المهام](../../tasks/README.md) و[نتائج التحقق](../../tasks/10-dashboard-testing.md) و[الهيكل والتراخيص المستقبلية](ARCHITECTURE.md).

## ما بعد هذه المرحلة

SQLite مختار معماريًا للمخزن المحلي لاحقًا ولم يُضف الآن. نظام التراخيص والتوقيع والبصمة ومولد الترخيص وحماية البيانات والـInstaller محددة في المهام11–18 ولم تُنفّذ. لا رابط تحميل تجاري ولا ملف تثبيت نهائي بهذه المرحلة. لا نشر لهذا التطبيق في Cloudflare Pages.
