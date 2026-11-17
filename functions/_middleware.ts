// Serve only the mapped public storefront on customer domains. Management stays
// on the configured first-party origin; never accept hostnames from query input.
export async function onRequest(context:any) {
 const {env,request}=context;
 const shortUrl=new URL(request.url);
 if((['daidarsoluations.com','www.daidarsoluations.com','daidarsite2.pages.dev'].includes(shortUrl.hostname)||shortUrl.hostname.endsWith('.daidarsite2.pages.dev'))&&/^\/s\/[a-z0-9-]+\/?$/.test(shortUrl.pathname)){
  const slug=shortUrl.pathname.split('/')[2],db=env.ECOSYSTEM_STORE_DB;
  const row=db?await db.prepare('SELECT store_id FROM store_short_links WHERE slug=? UNION ALL SELECT id AS store_id FROM stores WHERE id=? LIMIT 1').bind(slug,slug).first():null;
  if(!row)return new Response('Store not found',{status:404});
  shortUrl.pathname='/ar/hub/stores/';shortUrl.search='';
  return context.next(new Request(shortUrl,request));
 }
 if(env.DOMAIN_ROUTING_ENABLED!=='1')return context.next();
 const url=new URL(request.url);
 const primary=new Set(['daidarsoluations.com','www.daidarsoluations.com','daidarsite2.pages.dev']);
 if(env.ECOSYSTEM_HUB_ORIGIN)primary.add(new URL(env.ECOSYSTEM_HUB_ORIGIN).hostname);
 if(primary.has(url.hostname)||url.hostname.endsWith('.daidarsite2.pages.dev'))return context.next();
 const db=env.ECOSYSTEM_STORE_DB;
 if(!db)return new Response('Store unavailable',{status:503});
 let mapping:any;
 try{mapping=await db.prepare("SELECT store_id FROM store_domain_links WHERE domain=? AND status IN ('linking','active') UNION ALL SELECT store_id FROM domain_requests WHERE domain=? AND status IN ('linking','active') LIMIT 1").bind(url.hostname,url.hostname).first()}catch{return new Response('Store unavailable',{status:503})}
 if(!mapping)return new Response('Domain not connected',{status:404});
 if(url.pathname==='/api/store/domain-store')return Response.json({store_id:mapping.store_id},{headers:{'Cache-Control':'no-store'}});
 if(url.pathname.startsWith('/api/')) {
  const action=url.pathname.replace(/^\/api\/store\//,'');
  if(['store','products'].includes(action)&&request.method==='GET'){
   url.searchParams.set('store_id',mapping.store_id);url.searchParams.set('id',mapping.store_id);url.searchParams.delete('preview');
   const headers=new Headers(request.headers);headers.delete('Cookie');headers.delete('Authorization');
   return context.next(new Request(url,{method:'GET',headers}));
  }
  if(['orders','visit'].includes(action)&&request.method==='POST'){
   if(request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)return new Response('Forbidden',{status:403});
   if(Number(request.headers.get('Content-Length')||0)>2097152)return new Response('Too large',{status:413});
   let body:any;try{body=await request.json()}catch{return new Response('Invalid JSON',{status:400})}
   body.store_id=mapping.store_id;
   const headers=new Headers(request.headers);headers.delete('Cookie');headers.delete('Authorization');headers.set('Content-Type','application/json');headers.delete('Content-Length');
   return context.next(new Request(url,{method:'POST',headers,body:JSON.stringify(body)}));
  }
  return new Response('Not found',{status:404});
 }
 if(url.pathname.startsWith('/matjari/')||url.pathname.startsWith('/_next/')||url.pathname==='/favicon.ico')return context.next();
 if(url.pathname==='/'||url.pathname==='/ar/hub/stores/'||url.pathname==='/en/hub/stores/'){
  url.pathname='/ar/hub/stores/';url.search='';url.searchParams.set('view','storefront');url.searchParams.set('store_id',mapping.store_id);
  return context.next(new Request(url,request));
 }
 return new Response('Not found',{status:404});
}
