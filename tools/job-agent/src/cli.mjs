import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { PDFParse } from 'pdf-parse';
import { Tracker, DATA, hash, saveJSON, loadProfile, prepare, match } from './core.mjs';
import { discover } from './discovery.mjs';
import { verify, applicationSession } from './browser.mjs';

const [command,arg]=process.argv.slice(2);
const tracker=new Tracker();
try {
  if(command==='import-cv') {
    if(!arg) throw Error('Supply the full PDF path');
    const bytes=readFileSync(resolve(arg)); const parser=new PDFParse({data:bytes});
    const text=await parser.getText(); const info=await parser.getInfo({parsePageInfo:true}); await parser.destroy();
    mkdirSync(DATA,{recursive:true});copyFileSync(resolve(arg),resolve(DATA,'cv.pdf'));
    saveJSON(resolve(DATA,'cv-pages.json'),text.pages.map(p=>p.text));
    saveJSON(resolve(DATA,'cv-links.json'),info.pages.flatMap(p=>p.links));
    saveJSON(resolve(DATA,'profile.json'),{cvPath:resolve(DATA,'cv.pdf'),cvHash:hash(bytes),fields:{},facts:text.pages.flatMap((p,i)=>p.text.split('\n').filter(s=>s.trim().length>8).map(quote=>({page:i+1,quote}))) });
    console.log('Imported CV locally. Review data/profile.json; fields must be exact CV text. No years or links inferred.');
  } else if(command==='import-jobs') {
    for(const j of JSON.parse(readFileSync(resolve(arg),'utf8'))) console.log(tracker.add(j).id,j.company,j.role);
  } else if(command==='discover') {
    const sources=JSON.parse(readFileSync(resolve(arg),'utf8'));
    for(const source of sources) {for(const j of (await discover(source)).slice(0,5)) console.log(tracker.add(j).id,j.company,j.role);}
  } else if(command==='verify') {
    for(const j of arg==='all'?tracker.list():[tracker.get(arg)]) {
      if(j.status==='submitted'||j.status==='approved') continue;
      try {const verification=await verify(j);tracker.save(j.id,{verification},verification.state==='active'?'discovered':'needs-manual-action',verification.reason);console.log(j.id,verification.state,verification.reason);}
      catch(e) {tracker.save(j.id,{},'failed',e.message);console.error(j.id,e.message);}
    }
  } else if(command==='prepare') {
    const p=loadProfile();
    for(const j of arg==='all'?tracker.list():[tracker.get(arg)]) {
      if(['submitted','approved'].includes(j.status)) continue;
      try {tracker.save(j.id,prepare(j,p),'prepared','CV-grounded draft prepared; no final approval');console.log(j.id,'prepared');}
      catch(e) {tracker.save(j.id,{match:match(j,p)},'needs-manual-action',e.message);console.error(j.id,e.message);}
    }
  } else if(command==='open') {
    const rl=createInterface({input:process.stdin,output:process.stdout});
    try {await applicationSession(tracker,arg,q=>rl.question(q));}finally {rl.close();}
  } else if(command==='review-policy') {
    const j=tracker.get(arg);if(j.policy==='manual-only')throw Error('Employer explicitly requires manual applications');
    const rl=createInterface({input:process.stdin,output:process.stdout});
    try {
      const note=await rl.question('After reading employer and ATS terms, enter the policy URL and the basis for allowing assisted form filling (blank cancels): ');
      if(note.trim().length>20 && /https:\/\//.test(note))tracker.save(j.id,{policy:'reviewed-allowed',policyReview:note},j.status,'User reviewed application policy');
    } finally {rl.close();}
  } else if(command==='export') {
    writeFileSync(resolve(DATA,'applications.csv'),tracker.exportCSV());console.log('Saved data/applications.csv');
  } else if(command==='list') console.table(tracker.list().map(j=>({id:j.id,company:j.company,role:j.role,status:j.status,score:j.match?.score})));
  else console.log('Commands: import-cv <PDF>, import-jobs <JSON>, discover <sources.json>, verify <id|all>, prepare <id|all>, review-policy <id>, open <id>, list, export');
} catch(e) {console.error(e.message);process.exitCode=1;}
finally {tracker.db.close();}
