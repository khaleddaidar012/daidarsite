import type {StoreOrder} from '../types';

export function OrderDetails({order,currency,arabic}:{order:StoreOrder;currency:string;arabic:boolean}){
 let items: {product?:{name?:string;price?:number};quantity?:number}[]=[];
 try{const parsed=JSON.parse(order.items_json);if(Array.isArray(parsed))items=parsed.filter(item=>item&&typeof item==='object')}catch{}
 const text=(ar:string,en:string)=>arabic?ar:en;
 const money=(value:number)=>`${value.toLocaleString(arabic?'ar-EG':'en-US')} ${currency}`;
 return <div className="w-full min-w-0 space-y-4 border-t border-slate-100 pt-4">
  <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span dir="ltr">{order.id}</span><time>{new Date(order.created_at.replace(' ','T')+'Z').toLocaleString(arabic?'ar-EG':'en-US')}</time></div>
  <div className="overflow-x-auto rounded-xl border border-slate-100"><table className="w-full text-start text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-3 text-start">{text('المنتج','Product')}</th><th className="p-3">{text('الكمية','Quantity')}</th><th className="p-3">{text('سعر الوحدة','Unit price')}</th><th className="p-3">{text('الإجمالي','Total')}</th></tr></thead><tbody>{items.map((item,index)=>{const price=Number(item.product?.price)||0,quantity=Number(item.quantity)||0;return <tr key={index} className="border-t border-slate-100"><td className="p-3 font-bold">{item.product?.name||text('منتج غير محدد','Unknown product')}</td><td className="p-3 text-center">{quantity}</td><td className="p-3 text-center whitespace-nowrap">{money(price)}</td><td className="p-3 text-center font-bold whitespace-nowrap">{money(Math.round(price*quantity*100)/100)}</td></tr>})}</tbody></table>{!items.length&&<p className="p-3 text-sm text-slate-500">{text('تفاصيل المنتجات غير متاحة لهذا الطلب.','Item details are unavailable for this order.')}</p>}</div>
  <dl className="grid gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2"><div><dt className="mb-1 text-xs text-slate-500">{text('عنوان التوصيل','Delivery address')}</dt><dd className="whitespace-pre-wrap break-words">{order.customer_address||text('لم يحدده العميل','Not provided')}</dd></div><div><dt className="mb-1 text-xs text-slate-500">{text('ملاحظات العميل','Customer notes')}</dt><dd className="whitespace-pre-wrap break-words">{order.notes||text('لا توجد ملاحظات','No notes')}</dd></div></dl>
 </div>;
}
