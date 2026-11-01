import http from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Tracker, ROOT, DATA, loadProfile, prepare, hash, saveJSON } from './core.mjs';
import { discover } from './discovery.mjs';
import { verify, applicationSession } from './browser.mjs';
import { PDFParse } from 'pdf-parse';

const sessions=new Map();
async function body(req) {let raw='';for await(const c of req){raw+=c;if(raw.length>18_000_000)throw Error('Request too large');}return raw?JSON.parse(raw):{};}
function promptUI(session) { return message=>new Promise(resolve=>{session.prompt={message};session.answer=resolve;}); }

export function createServer(tracker=new Tracker()) {
  return http.createServer(async(req,res)=>{
    const host=req.headers.host;
    if(!/^127\.0\.0\.1:\d+$/.test(host||'')) {res.writeHead(403).end('Local access only');return;}
    const origin=`http://${host}`;
    if(req.headers.origin && req.headers.origin!==origin) {res.writeHead(403).end('Origin rejected');return;}
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'");
    const url=new URL(req.url,origin);
    try {
      if(req.method==='GET' && url.pathname==='/api/jobs') {
        res.setHeader('Content-Type','application/json');res.end(JSON.stringify(tracker.list()));
      } else if(req.method==='GET' && url.pathname==='/api/setup') {
        const preferencesReady=existsSync(resolve(DATA,'preferences.json'));res.setHeader('Content-Type','application/json');res.end(JSON.stringify({cvReady:existsSync(resolve(DATA,'profile.json')),preferencesReady,preferences:preferencesReady?JSON.parse(readFileSync(resolve(DATA,'preferences.json'),'utf8')):null}));
      } else if(req.method==='POST' && url.pathname==='/api/preferences') {
        const p=await body(req);const amounts=['Egypt','Saudi Arabia / UAE','Other international'].map(k=>Number(p.salaryMinimums?.[k]?.monthly));
        if(amounts.some(n=>!Number.isFinite(n)||n<=0))throw Error('Enter all three positive monthly minimum salaries');
        const saved={source:'Applicant preferences entered in local dashboard',salaryMinimums:{'Egypt':{currency:'EGP',monthly:amounts[0]},'Saudi Arabia / UAE':{currency:'USD',monthly:amounts[1]},'Other international':{currency:'USD',monthly:amounts[2]}},availability:'First day of next calendar month from application date; never immediate',remoteSponsorship:String(p.remoteSponsorship||'')};
        mkdirSync(DATA,{recursive:true});saveJSON(resolve(DATA,'preferences.json'),saved);res.end('{}');
      } else if(req.method==='POST' && url.pathname==='/api/cv') {
        const {name,data}=await body(req);if(!String(name).toLowerCase().endsWith('.pdf'))throw Error('Upload a PDF CV');
        const buffer=Buffer.from(String(data).replace(/^data:application\/pdf;base64,/,'').split(',').at(-1),'base64');
        if(buffer.length<100||buffer.length>12_000_000||buffer.subarray(0,5).toString()!=='%PDF-')throw Error('CV must be a valid PDF under 12 MB');
        mkdirSync(DATA,{recursive:true});writeFileSync(resolve(DATA,'cv.pdf'),buffer);const parser=new PDFParse({data:buffer});const text=await parser.getText();const info=await parser.getInfo({parsePageInfo:true});await parser.destroy();
        saveJSON(resolve(DATA,'cv-pages.json'),text.pages.map(p=>p.text));saveJSON(resolve(DATA,'cv-links.json'),info.pages.flatMap(p=>p.links));
        saveJSON(resolve(DATA,'profile.json'),{cvPath:resolve(DATA,'cv.pdf'),cvHash:hash(buffer),fields:{},facts:text.pages.flatMap((p,i)=>p.text.split('\n').filter(s=>s.trim().length>8).map(quote=>({page:i+1,quote})))});
        res.setHeader('Content-Type','application/json');res.end(JSON.stringify({pages:text.pages.length,links:info.pages.reduce((n,p)=>n+p.links.length,0)}));
      } else if(req.method==='POST' && url.pathname==='/api/seed') {
        const seeded=JSON.parse(readFileSync(resolve(ROOT,'initial-jobs.json'),'utf8')).map(j=>tracker.add(j));res.setHeader('Content-Type','application/json');res.end(JSON.stringify({count:seeded.length}));
      } else if(req.method==='GET' && url.pathname==='/api/session') {
        res.setHeader('Content-Type','application/json');res.end(JSON.stringify([...sessions.entries()].map(([id,s])=>({id,prompt:s.prompt?.message||null,done:s.done,error:s.error||null}))));
      } else if(req.method==='POST' && url.pathname==='/api/jobs') {
        const j=tracker.add(await body(req));res.setHeader('Content-Type','application/json');res.end(JSON.stringify(j));
      } else if(req.method==='POST' && url.pathname==='/api/sources/discover') {
        const source=await body(req);if(!source.reviewed)throw Error('Confirm you reviewed the company source and its terms first');
        const jobs=await discover(source);const added=jobs.map(j=>tracker.add(j));res.setHeader('Content-Type','application/json');res.end(JSON.stringify({count:added.length,jobs:added}));
      } else if(req.method==='POST' && url.pathname==='/api/verify') {
        const {id}=await body(req);const targets=id?[tracker.get(id)]:tracker.list();const results=[];
        for(const j of targets)try{const verification=await verify(j);tracker.save(j.id,{verification},verification.state==='active'?'discovered':'needs-manual-action',verification.reason);results.push({id:j.id,state:verification.state,reason:verification.reason});}catch(e){tracker.save(j.id,{},'needs-manual-action',e.message);results.push({id:j.id,state:'needs-manual-action',reason:e.message});}
        res.setHeader('Content-Type','application/json');res.end(JSON.stringify(results));
      } else if(req.method==='POST' && url.pathname==='/api/open') {
        const {id}=await body(req);const job=tracker.get(id);if(sessions.has(id)&&!sessions.get(id).done)throw Error('Application review is already open');
        const session={done:false,prompt:null};sessions.set(id,session);res.setHeader('Content-Type','application/json');res.end('{}');
        applicationSession(tracker,id,promptUI(session)).catch(e=>{session.error=e.message;}).finally(()=>{session.done=true;});
      } else if(req.method==='POST' && url.pathname==='/api/session/reply') {
        const {id,reply}=await body(req);const s=sessions.get(id);if(!s?.answer)throw Error('No approval request is waiting');const resolve=s.answer;s.answer=null;s.prompt=null;resolve(String(reply||''));res.end('{}');
      } else if(req.method==='POST' && /^\/api\/policy\/[a-f0-9]{12}$/.test(url.pathname)) {
        const id=url.pathname.split('/').at(-1),j=tracker.get(id),{reviewed,note}=await body(req);
        if(j.policy==='manual-only')throw Error('This employer requires a human-written application');
        if(reviewed!==true||String(note||'').trim().length<20||!String(note).includes('https://'))throw Error('Review the employer and ATS terms, then provide their URL and your notes');
        tracker.save(id,{policy:'reviewed-allowed',policyReview:note},j.status,'User reviewed employer application policy');res.end('{}');
      } else if(req.method==='GET' && url.pathname==='/api/export') {
        res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename="applications.csv"');res.end(tracker.exportCSV());
      } else if(req.method==='POST' && /^\/api\/prepare\/[a-f0-9]{12}$/.test(url.pathname)) {
        if(req.headers.origin!==origin || req.headers['x-job-agent']!=='local') throw Error('Local UI request required');
        const id=url.pathname.split('/').at(-1);const j=tracker.get(id);
        tracker.save(id,prepare(j,loadProfile()),'prepared','Draft prepared from dashboard');res.end('{}');
      } else if(req.method==='GET' && ['/', '/app.js','/style.css'].includes(url.pathname)) {
        const file=url.pathname==='/'?'index.html':url.pathname.slice(1);
        res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');
        res.end(readFileSync(resolve(ROOT,'public',file)));
      } else res.writeHead(404).end('Not found');
    } catch(e) {res.writeHead(400,{'Content-Type':'application/json'}).end(JSON.stringify({error:e.message}));}
  });
}
if(process.argv[1] && resolve(process.argv[1])===resolve(ROOT,'src/server.mjs')) {
  const port=Number(process.env.JOB_AGENT_PORT||4317);
  createServer().listen(port,'127.0.0.1',()=>console.log(`Job Agent: http://127.0.0.1:${port}`));
}
