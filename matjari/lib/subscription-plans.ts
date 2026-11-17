// One naming rule for checkout, stored subscriptions and Hub display.
export function storePlanName(features:readonly string[],ar=true){
 const protection=features.includes('protection_bundle'),support=features.includes('whatsapp_management');
 if(protection&&support)return ar?'الباقة المتكاملة':'Complete plan';
 if(protection)return ar?'باقة الحماية والمتابعة':'Protection & alerts plan';
 if(support)return ar?'باقة المساعدة':'Assistance plan';
 if(features.some(f=>['backups','phone_notifications'].includes(f)))return ar?'الباقة المخصصة':'Custom plan';
 return ar?'الباقة الأساسية':'Basic plan';
}
