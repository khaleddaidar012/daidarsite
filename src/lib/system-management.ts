export const systemManagementPlans = [{hours:1,price:800},{hours:2,price:1200},{hours:3,price:1600}]
export const servicePaymentNumbers = {instapay:'01092912431',vodafone:'01061532875'}
export function serviceEndDate(start: string, months: number) {
  const [year,month,day]=start.split('-').map(Number)
  const next=new Date(Date.UTC(year,month-1+months,1))
  const lastDay=new Date(Date.UTC(next.getUTCFullYear(),next.getUTCMonth()+1,0)).getUTCDate()
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth()+1).padStart(2,'0')}-${String(Math.min(day,lastDay)).padStart(2,'0')}`
}
export function serviceWhatsAppMessage(hours:number,start:number,method:keyof typeof servicePaymentNumbers,ar:boolean) {
  const plan=systemManagementPlans.find(p=>p.hours===hours)
  if(!plan||!Number.isInteger(start)||start<18||start+hours>24||!Object.prototype.hasOwnProperty.call(servicePaymentNumbers,method)) throw new Error('Invalid service choices')
  const time=(hour:number)=>hour===24?(ar?'١٢ منتصف الليل':'12 midnight'):`${(hour-12).toLocaleString(ar?'ar-EG':'en-US')} ${ar?'مساءً':'PM'}`
  const name=method==='instapay'?'InstaPay':ar?'فودافون كاش':'Vodafone Cash'
  return ar
    ? `السلام عليكم، اخترت خدمة إدارة السيستم من دعيدر هب.\nعدد الساعات: ${hours} ساعة يوميًا.\nالموعد المطلوب: من ${time(start)} إلى ${time(start+hours)} بتوقيت القاهرة.\nالباقة: ${plan.price} جنيه شهريًا.\nوسيلة الدفع: ${name} على رقم ${servicePaymentNumbers[method]}.\nتم الدفع، وسأرفق صورة التحويل هنا.\nبرجاء التواصل معي لتأكيد الموعد وبدء الخدمة.`
    : `Hello, I chose Daidar Hub system management.\nDaily hours: ${hours}.\nRequested time: ${time(start)} to ${time(start+hours)} (Cairo).\nPlan: EGP ${plan.price} per month.\nPayment: ${name}, ${servicePaymentNumbers[method]}.\nI have paid and will attach the transfer receipt here.\nPlease contact me to confirm the time and start the service.`
}
