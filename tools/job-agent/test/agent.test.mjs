import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import { Tracker, canonical, match, prepare, nextMonth, preferenceAnswers } from '../src/core.mjs';
import { blocker, fillSupported, launch, preparationGate } from '../src/browser.mjs';
import { createServer } from '../src/server.mjs';
const job={company:'Test Company',role:'Backend Developer',url:'https://example.com/jobs/123',requirements:[{skill:'Node.js',weight:2},{skill:'PostgreSQL',weight:1}],verification:{state:'active',at:new Date().toISOString()}};
const profile={cvHash:'test',fields:{fullName:'Test Applicant'},facts:[{page:1,quote:'Backend: Node.js and MongoDB'}]};
test('availability uses Cairo application date and rolls years correctly',()=>{
  assert.equal(nextMonth(new Date('2026-11-01T12:00:00Z')),'2026-12-01');
  assert.equal(nextMonth(new Date('2026-12-31T23:30:00Z')),'2027-02-01');
  const prefs={salaryMinimums:{Egypt:{currency:'EGP',monthly:20000}},remoteSponsorship:'No foreign visa sponsorship solely for remote work from Egypt.'};
  assert.match(preferenceAnswers({employerCountry:'Egypt'},prefs).salary,/not verified/);
  assert.match(preferenceAnswers({employerCountry:'Egypt',employerCountryVerified:true},prefs).salary,/EGP 20,000/);
});
test('deduplicates application/tracking URL variants without resetting status',()=>{
  const t=new Tracker(':memory:');const a=t.add(job);const b=t.add({...job,url:job.url+'/apply?utm_source=board'});assert.equal(a.id,b.id);assert.equal(t.list().length,1);t.db.close();
});
test('retains meaningful job query IDs',()=>assert.notEqual(canonical('https://example.com/job?id=1'),canonical('https://example.com/job?id=2')));
test('evidence score exposes absent skills and never infers years',()=>{
  const m=match(job,profile);assert.equal(m.score,67);assert.equal(m.rows[1].evidence,null);assert.deepEqual(m.gaps,['PostgreSQL']);
  const p=prepare(job,profile);assert.match(p.prepared.coverLetter,/Backend: Node.js and MongoDB/);assert.doesNotMatch(p.prepared.coverLetter,/years|PostgreSQL/);
});
test('policy and stale verification block drafts',()=>{
  assert.throws(()=>prepare({...job,policy:'manual-only'},profile),/human-written/);
  assert.throws(()=>prepare({...job,verification:{state:'active',at:'2000-01-01'}},profile),/Verify/);
});
test('approval must bind to exact draft and submission needs confirmation',()=>{
  const t=new Tracker(':memory:');const j=t.add(job);const p=prepare(job,profile);
  assert.throws(()=>t.save(j.id,{},'submitted'),/Invalid transition/);
  t.save(j.id,p,'prepared');assert.throws(()=>t.save(j.id,{approval:{digest:'wrong'}},'approved'),/Approval/);
  t.save(j.id,{approval:{digest:p.prepared.digest}},'approved');assert.throws(()=>t.save(j.id,{},'submitted'),/confirmation/);
  t.save(j.id,{confirmation:{verifiedAt:new Date().toISOString(),text:'Application received'}},'submitted');
  assert.throws(()=>t.save(j.id,{},'prepared'),/Invalid transition/);t.db.close();
});
test('CSV escapes formulas, newlines and quotes',()=>{
  const t=new Tracker(':memory:');t.add({...job,company:'=HYPERLINK("bad")\nName'});assert.match(t.exportCSV(),/"'=HYPERLINK\(""bad""\)/);t.db.close();
});
test('access and employer policy detection',()=>{
  for(const s of ['Verify you are human','I agree to use only my own words','This position has been filled'])assert.ok(blocker(s));
});
test('local dashboard rejects foreign hosts and cross-origin mutations',async()=>{
  const t=new Tracker(':memory:');t.add(job);const server=createServer(t);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  try {assert.equal((await fetch(base+'/api/jobs')).status,200);const hostStatus=await new Promise((done,reject)=>{http.get(base+'/api/jobs',{headers:{Host:'evil.example'}},r=>{r.resume();done(r.statusCode);}).on('error',reject);});assert.equal(hostStatus,403);assert.equal((await fetch(base+'/api/prepare/000000000000',{method:'POST',headers:{Origin:'https://evil.example'}})).status,403);assert.equal((await fetch(base+'/data/profile.json')).status,404);}
  finally {await new Promise(r=>server.close(r));t.db.close();}
});
test('Playwright fills only supported labels, uploads only CV, leaves sensitive and unknown fields blank',async()=>{
  const browser=await launch(true);const dir=mkdtempSync(join(tmpdir(),'job-agent-test-'));const cv=join(dir,'synthetic.txt');writeFileSync(cv,'Synthetic test CV; not an application');
  try {
    const page=await browser.newPage();await page.setContent('<label>Full name<input name="name"></label><label>Email<input type="email"></label><label>Resume<input type="file"></label><label>Passport<input name="passport"></label><label>Desired salary<input required></label><button type="submit">Submit application</button>');
    const result=await fillSupported(page,{fullName:'Synthetic Applicant',email:'test@example.invalid',passport:'DO NOT FILL'},cv);
    assert.equal(await page.getByLabel('Full name').inputValue(),'Synthetic Applicant');assert.equal(await page.getByLabel('Passport').inputValue(),'');assert.equal(result.uploaded,true);assert.ok(result.missing.includes('Desired salary'));
    await page.setContent('<label>Password<input type="password"></label><label>Full name<input></label>');
    assert.match((await fillSupported(page,{fullName:'Synthetic Applicant'},cv)).blocked,/Login/);
    assert.equal(await page.getByLabel('Full name').inputValue(),'');
  } finally {await browser.close();rmSync(dir,{recursive:true,force:true});}
});
test('real browser POST cannot reach server until explicit session approval',async()=>{
  let posts=0,approved=false;const server=http.createServer((req,res)=>{if(req.method==='POST')posts++;res.end('Synthetic fixture');});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
  const browser=await launch(true);
  try {const ctx=await browser.newContext({serviceWorkers:'block'});const gate=await preparationGate(ctx,()=>approved);const p=await ctx.newPage();await p.goto(url);
    await p.evaluate(()=>fetch('/submit',{method:'POST'}).catch(()=>{}));assert.equal(posts,0);assert.equal(gate.blockedWrites,1);
    approved=true;await p.evaluate(()=>fetch('/submit',{method:'POST'}));assert.equal(posts,1);
  } finally {await browser.close();await new Promise(r=>server.close(r));}
});
