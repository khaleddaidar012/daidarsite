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
    const v=el('button','Verify opening');v.className='secondary';v.onclick=async()=>{await action('/api/verify',{id:j.id});};actions.append(v);
    const b=el('button','Prepare draft');b.disabled=['submitted','approved'].includes(j.status)||j.policy==='manual-only';b.onclick=async()=>{try{const r=await fetch(`/api/prepare/${j.id}`,{method:'POST',headers:{'X-Job-Agent':'local'}});const d=await r.json();if(!r.ok)throw Error(d.error);await load();}catch(e){document.querySelector('#error').textContent=e.message;}};actions.append(b);card.append(actions);
    const detail=el('details');detail.append(el('summary','Evidence, draft & next steps'));
    detail.append(el('p',`Verification: ${j.verification?.state||'Not checked'} · ${j.verification?.at||''} · ${j.verification?.reason||''}`));
    if(j.formReview?.blocked)detail.append(el('p',`Form review: ${j.formReview.blocked}`,'caution'));
    detail.append(el('p',j.match?.method||'Prepare to compare against your CV.'));
    const table=el('table');const head=el('tr');for(const h of ['Requirement','CV evidence','Result'])head.append(el('th',h));table.append(head);
    for(const r of j.match?.rows||[]){const row=el('tr');row.append(el('td',r.skill),el('td',r.evidence?`Page ${r.evidence.page}: ${r.evidence.quote}`:'Not stated in CV'),el('td',r.matched?'Supported':'Gap'));table.append(row);}detail.append(table);
    if(j.prepared){detail.append(el('h4','Draft cover letter — review before use'),el('pre',j.prepared.coverLetter),el('h4','Your application preferences'),el('pre',JSON.stringify(j.prepared.suggestedAnswers||{},null,2)),el('h4','Missing / manual answers'),el('p',j.prepared.missing.join(' · ')));}
    if(j.status==='prepared'&&j.policy!=='reviewed-allowed'&&j.policy!=='manual-only'){
      const pf=el('form',undefined,'policy-form');pf.append(el('h4','Review application rules before assisted filling'));
      const note=el('input');note.type='url';note.required=true;note.placeholder='Employer or ATS terms URL';pf.append(note);
      const detailNote=el('input');detailNote.required=true;detailNote.minLength=10;detailNote.placeholder='Brief notes on permitted application assistance';pf.append(detailNote);
      const confirm=el('label',undefined,'check'),box=el('input');box.type='checkbox';box.required=true;confirm.append(box,document.createTextNode('I reviewed these terms and confirm assisted form filling is allowed.'));pf.append(confirm);
      const save=el('button','Save review');save.type='submit';pf.append(save);pf.onsubmit=async e=>{e.preventDefault();await action(`/api/policy/${j.id}`,{reviewed:box.checked,note:`${note.value}\n${detailNote.value}`});};detail.append(pf);
    }
    if(j.status==='prepared'&&j.policy==='reviewed-allowed'){const open=el('button','Open application review');open.onclick=async()=>{await action('/api/open',{id:j.id});};detail.append(open);}
    card.append(detail);list.append(card);
  }
  if(!jobs.length)list.append(el('p','No jobs yet. Import your CV and the initial shortlist using the README commands.'));
}
async function load(){const r=await fetch('/api/jobs');if(!r.ok)throw Error('Could not load tracker');jobs=await r.json();render();}
async function action(path,data){try{const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-Job-Agent':'local'},body:JSON.stringify(data)});const result=await r.json();if(!r.ok)throw Error(result.error);document.querySelector('#error').textContent='';await load();}catch(e){document.querySelector('#error').textContent=e.message;}}
document.querySelector('#google-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);const q=[f.get('keywords'),f.get('industries'),f.get('location'),'jobs'].filter(Boolean).join(' ');window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`,'_blank','noopener');};
document.querySelector('#source-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await action('/api/sources/discover',{company:f.get('company'),board:f.get('board'),type:f.get('type'),reviewed:f.get('reviewed')==='on'});};
document.querySelector('#job-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await action('/api/jobs',{company:f.get('company'),role:f.get('role'),url:f.get('url'),applicationUrl:f.get('applicationUrl')||f.get('url'),eligibility:f.get('eligibility')||'Unverified',salary:f.get('salary')||'Not published',employment:'Review listing',sector:f.get('sector')||'Unclassified',policy:'unreviewed',requirements:String(f.get('requirements')||'').split(',').map(s=>s.trim()).filter(Boolean).map(skill=>({skill,weight:1})),cautions:['Review job requirements and location eligibility against the original listing.']});e.currentTarget.reset();};
document.querySelector('#verify-all').onclick=()=>action('/api/verify',{});
document.querySelector('#seed').onclick=()=>action('/api/seed',{});
document.querySelector('#cv-form').onsubmit=async e=>{e.preventDefault();const file=new FormData(e.currentTarget).get('cv');if(!file)return;const bytes=await file.arrayBuffer();let binary='';for(const byte of new Uint8Array(bytes))binary+=String.fromCharCode(byte);await action('/api/cv',{name:file.name,data:btoa(binary)});await setup();};
async function setup(){const r=await fetch('/api/setup');const s=await r.json();document.querySelector('#setup-state').textContent=`CV ${s.cvReady?'saved locally':'needed'} · salary and availability preferences ${s.preferencesReady?'saved':'not set'}`;}
document.querySelector('#preferences-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await action('/api/preferences',{salaryMinimums:{'Egypt':{monthly:f.get('egypt')},'Saudi Arabia / UAE':{monthly:f.get('gulf')},'Other international':{monthly:f.get('other')}},remoteSponsorship:f.get('sponsorship')});await setup();};
document.querySelector('#filter').onchange=render;
async function poll(){try{const sessions=await(await fetch('/api/session')).json(),box=document.querySelector('#session-prompts');box.replaceChildren();for(const s of sessions){if(!s.prompt)continue;const panel=el('div',undefined,'approval');panel.append(el('h3','Application review'),el('p',s.prompt));const form=el('form'),input=el('input');input.placeholder=s.prompt.includes('APPROVE')?`Type APPROVE ${s.id}`:'Optional response';const send=el('button',s.prompt.includes('APPROVE')?'Approve':'Continue');send.type='submit';form.append(input,send);form.onsubmit=e=>{e.preventDefault();action('/api/session/reply',{id:s.id,reply:input.value});};panel.append(form);box.append(panel);}if(sessions.some(s=>s.done))await load();}catch{}setTimeout(poll,1200);}
load().catch(e=>document.querySelector('#error').textContent=e.message);setup().then(async()=>{const p=await(await fetch('/api/setup')).json();if(p.preferences){const f=document.querySelector('#preferences-form');f.elements.egypt.value=p.preferences.salaryMinimums?.Egypt?.monthly||'';f.elements.gulf.value=p.preferences.salaryMinimums?.['Saudi Arabia / UAE']?.monthly||'';f.elements.other.value=p.preferences.salaryMinimums?.['Other international']?.monthly||'';f.elements.sponsorship.value=p.preferences.remoteSponsorship||'';}});poll();
