import http from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Tracker, ROOT, loadProfile, prepare } from './core.mjs';

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
