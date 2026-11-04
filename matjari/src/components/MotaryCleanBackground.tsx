import React from 'react';

export default function MotaryCleanBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* 1. شبكة تقنية خفيفة جداً (Tech Grid) تدي إيحاء بالبنية السحابية المنظمة */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e0f2fe_1px,transparent_1px),linear-gradient(to_bottom,#e0f2fe_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-60 dark:opacity-30" />

      {/* 2. إضاءة خفيفة ونايس (Soft Glow) في زوايا الهيدر بلون سماوي هادئ وثابت تقريباً */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-sky-400/10 dark:bg-sky-500/15 rounded-full blur-[100px]" />
      
      {/* 3. وميض بطيء جداً ونبض غير ملحوظ يعطي إيحاء بالحياة للمنصة دون أي إزعاج للعين */}
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-blue-500/5 dark:bg-sky-400/10 rounded-full blur-[120px] animate-pulse duration-1000" />
    </div>
  );
}
