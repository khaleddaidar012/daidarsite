import { skills, now } from './core.mjs';

// Public read-only ATS feeds. Users review board identity and terms before adding a source.
export async function discover(source) {
  if(!source.reviewed || !/^[a-z0-9_-]+$/i.test(source.board)) throw Error('A reviewed company board is required');
  let url;
  if(source.type==='lever') url=`https://api.lever.co/v0/postings/${source.board}?mode=json`;
  else if(source.type==='greenhouse') url=`https://boards-api.greenhouse.io/v1/boards/${source.board}/jobs?content=true`;
  else throw Error('Supported sources: lever, greenhouse. Import other original listings manually.');
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
  if(!response.ok) throw Error(`Source returned ${response.status}; no retries or bypass`);
  const data=await response.json();
  return (Array.isArray(data)?data:data.jobs).filter(j=>/full.?stack|backend|back.end|node|react|next\.js|frontend/i.test(j.text||j.title)).map(j=>{
    const text=(j.descriptionPlain||j.content||'').replace(/<[^>]+>/g,' ');
    return {company:source.company,role:j.text||j.title,url:j.hostedUrl||j.absolute_url,applicationUrl:j.applyUrl||j.absolute_url,
      location:j.categories?.location||j.location?.name||'Unknown',eligibility:'Unverified — review geographic restrictions',salary:'Not published / not extracted',
      source:{type:source.type,board:source.board,at:now()},policy:'unreviewed',requirements:Object.entries(skills).filter(([,re])=>re.test(text)).map(([skill])=>({skill,weight:1})),cautions:['Feed keywords are provisional; review required vs preferred skills, seniority, Egypt eligibility, employment type and employer legitimacy before preparing.']};
  });
}
