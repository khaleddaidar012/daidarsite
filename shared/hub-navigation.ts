export const hubSections = ['services','dashboard','my-services','subscriptions','account','stores','systems','other-services','login','admin'] as const;
export type HubSection = typeof hubSections[number] | 'home';
export function safeHubReturn(value: unknown, locale='ar') {
  if(typeof value!=='string'||value.includes('\\')||value.includes('%')||value.includes('#'))return null;
  const allowed = new Set(['ar','en'].flatMap(lang=>['',...hubSections].map(section=>`/${lang}/hub${section?'/'+section:''}`)));
  return allowed.has(value)?value:null;
}
