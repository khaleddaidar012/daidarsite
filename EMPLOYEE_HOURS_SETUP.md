# إعداد حدود الساعات ومتابعة الحضور

## الجدول الأسبوعي وتصاريح تغيير الشفت

أضيفت `migrations/0020_employee_work_schedules.sql` لتثبيت نوافذ الحضور الأسبوعية و`migrations/0021_employee_shift_change_requests.sql` لطلبات تغيير الشفت. هذان التحديثان أُضيفا إلى قاعدة الإنتاج يدويًا بعد التحقق من مخططها؛ سجل `d1_migrations` في الإنتاج لا يحتوي تاريخ التحديثات السابقة، لذلك لا تستخدم `wrangler d1 migrations apply` عليها لأنه سيحاول إعادة تشغيل migrations القديمة. افحص الأعمدة والجداول قبل أي تحديث يدوي لاحق.

في صفحة إدارة الموظفين، يحدد «تثبيت ساعات العمل» تاريخ بدء الجدول ونوافذ كل يوم. يمنع الخادم الحضور خارج الفترات المثبتة. يمكن للموظف إرسال حتى ٣ طلبات تغيير شفت في شهر التقديم؛ لا يُفعّل الموعد البديل قبل موافقة الإدارة، ويُستهلك الإذن عند تسجيل الحضور.

إذا كان تفعيل الجدول يبدأ في منتصف الشهر، احتساب المستحق الآلي المجدول يبدأ من تاريخ التطبيق، على أساس أيام العمل المثبتة مع استبعاد أيام الراحة، ويُقرب لأقرب جنيه.

التحديث `migrations/0015_employee_hour_limits.sql` يضيف حد ساعات يومي وشهري لكل موظف وجدول متابعة التنبيهات. والتحديث `migrations/0016_employee_web_push.sql` يضيف اشتراكات إشعارات الأجهزة. لا تشغلهما قبل تجهيز جدول الورديات.

## ترتيب تحديث قاعدة D1

من Cloudflare Dashboard افتح قاعدة D1 المرتبطة بالـ binding `DB` ثم Console. نفّذ كل ملف migration مرة واحدة وبالترتيب التالي إذا لم تكن قد نفذتها بالفعل:

1. `migrations/0011_employee_multiple_shifts.sql`
2. `migrations/0013_checkout_accomplishments.sql`
3. `migrations/0015_employee_hour_limits.sql`
4. `migrations/0016_employee_web_push.sql`

إذا كان 0011 أو 0013 مطبقًا بالفعل، تخطّه ولا تعِد تشغيله. بعد كل ملف تأكد أن نتيجة التنفيذ ناجحة.

## قواعد الحساب

- أجر الساعة = المرتب الشهري ÷ حد الساعات الشهري.
- الساعات المدفوعة لكل يوم لا تتجاوز الحد اليومي، وإجمالي الشهر لا يتجاوز الحد الشهري.
- الإجازة المعتمدة تُحتسب مدفوعة بحد ساعات يوم واحد؛ وأيام الراحة المحددة لا تسجل غيابًا.
- تقريب المستحق النهائي لأقرب جنيه. مثال ٣٠٠٠ جنيه ÷ ١٠٤ ساعات = قرابة ٢٨٫٨٥ جنيه للساعة؛ أربع ساعات تساوي قرابة ١١٥ جنيهًا.
- الحد الافتراضي ٤ ساعات يوميًا و١٠٤ شهريًا. عدّله من حساب كل موظف بما يناسب جدول عمله.

## إشعارات النظام والرد من الإشعار

لإرسال إشعار أثناء تصغير المتصفح أو بعد إغلاق التاب، يلزم نشر Worker منفصل لأن Pages Functions لا تشغّل Cron Triggers. جهّز Worker مرة واحدة:

1. أنشئ مفاتيح VAPID محليًا من جذر المشروع بالأمر `node scripts/generate-vapid.cjs`. احتفظ بقيمة `VAPID_PRIVATE_JWK` سرًا ولا ترفعها إلى Git.
2. في إعدادات مشروع Pages أضف متغيرًا عاديًا باسم `VAPID_PUBLIC_KEY` بالقيمة العامة الناتجة.
3. افتح `workers/attendance-push/wrangler.jsonc` وضع معرّف قاعدة D1 نفسها بدل `REPLACE_WITH_YOUR_D1_DATABASE_ID`، ثم ضع المفتاح العام بدل `REPLACE_WITH_GENERATED_PUBLIC_KEY`.
4. من الطرفية المسجّلة إلى Cloudflare نفّذ `npx wrangler secret put VAPID_PRIVATE_JWK --config workers/attendance-push/wrangler.jsonc` والصق القيمة الخاصة، ثم انشر بـ`npx wrangler deploy --config workers/attendance-push/wrangler.jsonc`.
5. سجّل دخول الموظف، واضغط «تفعيل إشعارات النظام» واسمح بالإشعارات. يدعم الإشعار زري «موجود · كمل» و«انصراف».

الـ Worker يفحص الحضور كل دقيقة ويرسل Web Push إلى Service Worker؛ لذلك لا يحتاج الموظف فتح صفحة الموقع للرد. قد تختلف طريقة عرض الأزرار بحسب المتصفح ونظام التشغيل، كما يجب أن يسمح النظام بإشعارات المتصفح.

## التحقق الدوري من الوجود

يبدأ التأكيد الأول بعد ساعة من تسجيل الحضور، وتكون نافذة الرد دقيقتين. إذا لم يرد الموظف، يظهر تنبيه ثانٍ بعد ٥ دقائق، ثم ثالث بعد ١٥ دقيقة. لكل تنبيه دقيقتان للرد. عند عدم الرد على التنبيه الثالث تُغلق الوردية عند آخر تأكيد ناجح. اختيار «انصراف» يغلقها فورًا.

الجدولة محفوظة في D1 وتُعالج بواسطة الـ Worker المجدول، أو أثناء فتح صفحة الموظف كخطة بديلة. إشعار المتصفح يحتاج إذنًا من الموظف، والرد من زر الإشعار يحفظ حضوره على الخادم مباشرة.
## الزيادة والخصم دون إيقاف الحساب التلقائي — 2026-11-15

قبل نشر الإصلاح، أضف العمود الوارد في `migrations/0022_relative_payroll_adjustments.sql` مرة واحدة لقواعد Hub المستخدمة في الإنتاج/المعاينة. احتفظ بنسخة خاصة من جدول `employee_payroll_adjustments` قبل التغيير.

تعديلات الإدارة الجديدة هي `adjustment_piasters`: قيمة موجبة للمكافأة أو سالبة للخصم تُضاف للحساب الأساسي المتجدد للشهر. الحفظ يستبدل فرق الشهر ولا يراكم نفس الطلب عند إعادة الإرسال. لا تصبح المكافأة جزءًا من الراتب الأساسي، ولا تنتقل إلى شهر آخر. يعرض الموظف والإدارة نفس الحساب، والمستحق النهائي لا ينخفض عن الصفر.

`due_piasters` يبقى لقطة توافق تاريخية. السجلات القديمة التي يكون فيها `adjustment_piasters IS NULL` تحافظ على الإجمالي القديم ولا تُحوّل عشوائيًا لأن نية التعديل وقاعدة الحساب القديمة قد لا تكون معروفتين. يمكن تعديلها من الإدارة إلى زيادة/خصم أو إلغاؤها. العميل القديم الذي يرسل إجماليًا يستمر مدعومًا؛ الخادم يحوّله إلى فرق عن الحساب الأساسي وقت الحفظ، فلا يوقف تراكم الأيام التالية.

لتصحيح تسوية خالد المعروفة في نوفمبر، تُحوّل إلى زيادة 75 جنيه مستقلة بعملية إنتاج محددة ومراجعة، دون تحويل تسويات موظفين آخرين. اختبارات الإدارة تغطي زيادة اليوم التالي، تكرار الحفظ، توافق العميل القديم، الخصم دون الصفر، خصوصية الموظف وتطابق حساب الموظف والإدارة. لا يغير الإصلاح قواعد الحضور أو أيام الراحة أو توقيت استحقاق يوم العمل.

## Hourly payroll from November 2026

Apply migrations/0023_hourly_payroll_rates.sql once before deploying the updated functions. Back up employees, attendance_shifts and employee_payroll_adjustments first. It seeds each existing employee's implied hourly rate from their salary/hour limit, rounded once to piasters; no attendance, salary or work windows are deleted. Set Khaled sarhhan's explicit rate to 3500 piasters following the user's instruction.

The latest rate effective on/before the report month determines hourly payroll. Changes in the employee editor apply from the current Cairo month. Prior months without an effective rate retain legacy calculations. Subsequent-month rate edits do not rewrite earlier rates.

Hourly payroll uses recorded actual hours, including ongoing overnight shifts, without daily/monthly salary caps or automatic paid-leave hours. Work-window check-in restrictions remain independent. Money rounds once to the nearest piaster. Historical legacy calculations remain capped and rounded as before.

Admin monthly bonuses/deductions accept signed integer piasters, replace on retry, and do not carry to the next month. Employee pay visibility still requires view_due; both employee and admin use the same effective rate and bonus. Replacing the old 75 EGP with a top-up to 1000 EGP must use a fixed bonus computed at an explicit timestamp, not a frozen total or an extra 75. A running shift can increase the total immediately afterwards.

Validation: node scripts/test-admin.cjs; node scripts/test-hourly-payroll.cjs; npm run build.
