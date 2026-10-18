const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript')
const m={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync('src/lib/system-management.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m,m.exports)
const {serviceWhatsAppMessage,systemManagementPlans}=m.exports
for(const plan of systemManagementPlans)for(const method of ['instapay','vodafone'])for(const ar of [true,false]){
 const text=serviceWhatsAppMessage(plan.hours,18,method,ar)
 assert.ok(text.includes(String(plan.price)))
 assert.ok(text.includes(String(plan.hours)))
 assert.ok(text.includes(method==='instapay'?'01092912431':'01061532875'))
 assert.ok(text.includes(ar?'بتوقيت القاهرة':'Cairo'))
 assert.ok(text.includes(ar?'تم الدفع':'I have paid'))
 assert.equal(decodeURIComponent(encodeURIComponent(text)),text)
}
assert.throws(()=>serviceWhatsAppMessage(3,23,'instapay',true))
assert.throws(()=>serviceWhatsAppMessage(4,18,'instapay',true))
console.log('Service message tests passed: all plan prices, daily hours, requested times, both payment numbers and languages are inserted automatically.')
