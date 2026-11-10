export function storefrontUrl(storeId: string, baseUrl?: string, preview = false) {
  const origin = typeof window === 'undefined' ? 'https://daidarsoluations.com' : window.location.origin
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
