import Script from 'next/script'

export default function MatjariHubPage() {
  return <>
    <link rel="stylesheet" href="/matjari/assets/matjari.css" />
    <div id="root" className="min-h-[70vh] w-full" />
    <Script src="/matjari/assets/matjari.js" strategy="afterInteractive" type="module" />
  </>
}
