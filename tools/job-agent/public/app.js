const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
let jobs=[];
function render(){
  const stats=document.querySelector('#stats');stats.replaceChildren();
  for(const [name,count] of [['In your tracker',jobs.length],['Prepared',jobs.filter(j=>j.status==='prepared').length],['Needs your attention',jobs.filter(j=>j.status==='needs-manual-action').length],['Confirmed submitted',jobs.filter(j=>j.status==='submitted').length]]){const s=el('div',undefined,'stat');s.append(el('strong',count),el('span',name));stats.append(s);}
  const list=document.querySelector('#jobs');list.replaceChildren();
  for(const j of jobs.filter(j=>!document.querySelector('#filter').value||j.status===document.querySelector('#filter').value).sort((a,b)=>(b.priority||0)-(a.priority||0))){
    const card=el('article',undefined,'job'),top=el('div',undefined,'job-top'),title=el('div');title.append(el('div',j.company,'company'),el('h3',j.role),el('span',j.status,'badge'));
    const score=el('div',j.match?.score===null||j.match?.score===undefined?'—':`${j.match.score}%`,'score');score.append(el('small','CV evidence coverage'));top.append(title,score);card.append(top);
    const meta=el('div',undefined,'meta');for(const [name,value] of [['Published salary',j.salary||'Not published'],['Location eligibility',j.eligibility||'Unverified'],['Employment / focus',`${j.employment||'Unknown'} · ${j.sector||'Unclassified'}`]]){const c=el('div');c.append(el('small',name),el('div',value));meta.append(c);}card.append(meta);
    for(const text of j.cautions||[])card.append(el('p',text,'caution'));
    const actions=el('div',undefined,'actions'),a=el('a','Original application ↗');a.href=j.applicationUrl||j.url;a.target='_blank';a.rel='noreferrer noopener';actions.append(a);
    const b=el('button','Prepare draft');b.disabled=['submitted','approved'].includes(j.status)||j.policy==='manual-only';b.onclick=async()=>{try{const r=await fetch(`/api/prepare/${j.id}`,{method:'POST',headers:{'X-Job-Agent':'local'}});const d=await r.json();if(!r.ok)throw Error(d.error);await load();}catch(e){document.querySelector('#error').textContent=e.message;}};actions.append(b);card.append(actions);
    const detail=el('details');detail.append(el('summary','Evidence, draft & next steps'));
    detail.append(el('p',`Verification: ${j.verification?.state||'Not checked'} · ${j.verification?.at||''} · ${j.verification?.reason||''}`));
    if(j.formReview?.blocked)detail.append(el('p',`Form review: ${j.formReview.blocked}`,'caution'));
    detail.append(el('p',j.match?.method||'Prepare to compare against your CV.'));
    const table=el('table');const head=el('tr');for(const h of ['Requirement','CV evidence','Result'])head.append(el('th',h));table.append(head);
    for(const r of j.match?.rows||[]){const row=el('tr');row.append(el('td',r.skill),el('td',r.evidence?`Page ${r.evidence.page}: ${r.evidence.quote}`:'Not stated in CV'),el('td',r.matched?'Supported':'Gap'));table.append(row);}detail.append(table);
    if(j.prepared){detail.append(el('h4','Draft cover letter — review before use'),el('pre',j.prepared.coverLetter),el('h4','Your application preferences'),el('pre',JSON.stringify(j.prepared.suggestedAnswers||{},null,2)),el('h4','Missing / manual answers'),el('p',j.prepared.missing.join(' · ')));}
    detail.append(el('p','Run from tools/job-agent to review the form in a fresh browser:'),el('code',`npm run cli -- open ${j.id}`));card.append(detail);list.append(card);
  }
  if(!jobs.length)list.append(el('p','No jobs yet. Import your CV and the initial shortlist using the README commands.'));
}
async function load(){const r=await fetch('/api/jobs');if(!r.ok)throw Error('Could not load tracker');jobs=await r.json();render();}
document.querySelector('#filter').onchange=render;load().catch(e=>document.querySelector('#error').textContent=e.message);
