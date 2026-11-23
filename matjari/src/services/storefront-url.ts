export function storefrontUrl(storeId: string, baseUrl?: string, preview = false) {
  const origin = typeof window === 'undefined' ? 'https://daidarsoluations.com' : window.location.origin
  if(!preview)return new URL('/s/'+encodeURIComponent(storeId),origin).toString()
  const currentPath = typeof window === 'undefined' ? '' : window.location.pathname
  const path = baseUrl || (/^\/(?:ar|en)\/hub\/stores\/?$/.test(currentPath) ? currentPath : '/ar/hub/stores/')
  const url = new URL(path.endsWith('/') ? path : `${path}/`, origin)
  // Preview links must escape the installed app's same-origin PWA scope.
  if (preview) url.hostname = 'daidarsite2.pages.dev'
  url.search = ''
  url.searchParams.set('view', 'storefront')
  url.searchParams.set('store_id', storeId)
  if (preview) url.searchParams.set('preview', '1')
  return url.toString()
}

export async function preferredStorefrontUrl(storeId:string){
 const res=await fetch('/api/store/short-link?store_id='+encodeURIComponent(storeId),{cache:'no-store'});
 if(!res.ok)return storefrontUrl(storeId);
 const data=await res.json();
 return data.domain?'https://'+data.domain+'/':new URL('/s/'+data.slug,window.location.origin).toString();
}

export async function openStorePreview(storeId:string,baseUrl?:string){
 const tab=window.open('about:blank','_blank');if(tab)tab.opener=null;
 let target=storefrontUrl(storeId);
 try{target=await preferredStorefrontUrl(storeId)}catch{}
 if(tab)tab.location.replace(target);
}
