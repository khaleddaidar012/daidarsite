import Script from 'next/script'

export default function MatjariHubPage() {
  const assetVersion = process.env.MATJARI_ASSET_VERSION || 'local'
  return <>
    <link rel="stylesheet" href={`/matjari/assets/matjari.css?v=${assetVersion}`} />
    <div id="root" className="min-h-[70vh] w-full" />
    <Script src={`/matjari/assets/matjari.js?v=${assetVersion}`} strategy="afterInteractive" type="module" />
  </>
}
