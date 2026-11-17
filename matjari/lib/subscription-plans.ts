// One naming rule for checkout, stored subscriptions and Hub display.
export function storePlanName(features:readonly string[],ar=true){
 const protection=features.includes('protection_bundle');
 if(protection)return ar?'باقة الحماية والمتابعة':'Protection & alerts plan';
 if(features.some(f=>['backups','phone_notifications','whatsapp_management'].includes(f)))return ar?'الباقة المخصصة':'Custom plan';
 return ar?'الباقة الأساسية':'Basic plan';
}
