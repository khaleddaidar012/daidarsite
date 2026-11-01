import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DATA = resolve(ROOT, 'data');
export const now = () => new Date().toISOString();
export const fresh = at => Number.isFinite(Date.parse(at)) && Date.now()-Date.parse(at)>=0 && Date.now()-Date.parse(at)<86400000;
export const hash = value => createHash('sha256').update(value).digest('hex');
export function canonical(value) {
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.username || u.password) throw Error('Only public HTTPS job URLs are supported.');
  if (/^(localhost|127\.|10\.|192\.168\.|\[|0\.)/i.test(u.hostname)) throw Error('Private destinations are not supported.');
  for (const key of [...u.searchParams.keys()]) if (/^(utm_|source$|ref$)/i.test(key)) u.searchParams.delete(key);
  u.hash = ''; u.pathname = u.pathname.replace(/\/apply\/?$/, '').replace(/\/$/, '');
  return u.href;
}
export class Tracker {
  constructor(path = resolve(DATA, 'tracker.sqlite')) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, url TEXT UNIQUE, payload TEXT NOT NULL, status TEXT NOT NULL, updated TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, job_id TEXT, at TEXT, status TEXT, note TEXT);`);
  }
  list() { return this.db.prepare('SELECT * FROM jobs ORDER BY updated DESC').all().map(r => ({ ...JSON.parse(r.payload), id:r.id, status:r.status, updated:r.updated })); }
  get(id) { const job = this.list().find(j => j.id === id); if (!job) throw Error('Unknown job'); return job; }
  add(job) {
    const url = canonical(job.url); const id = hash(url).slice(0, 12);
    const exists = this.db.prepare('SELECT id FROM jobs WHERE url=?').get(url);
    if (exists) return this.get(exists.id);
    if (!job.company || !job.role) throw Error('Company and role are required');
    this.db.prepare('INSERT INTO jobs VALUES(?,?,?,?,?)').run(id,url,JSON.stringify({...job,url}),'discovered',now());
    this.event(id,'discovered','Original listing saved'); return this.get(id);
  }
  event(id,status,note) { this.db.prepare('INSERT INTO events(job_id,at,status,note) VALUES(?,?,?,?)').run(id,now(),status,note); }
  save(id, patch, status, note = '') {
    const old = this.get(id);
    const allowed = {discovered:['discovered','prepared','needs-manual-action','failed'],prepared:['discovered','prepared','approved','needs-manual-action','failed'],approved:['submitted','needs-manual-action','failed'],failed:['discovered','prepared','needs-manual-action','failed'],'needs-manual-action':['discovered','prepared','needs-manual-action','failed'],submitted:[]};
    if (!allowed[old.status].includes(status)) throw Error(`Invalid transition ${old.status} -> ${status}`);
    if (status === 'approved' && (!patch.approval?.digest || patch.approval.digest !== old.prepared?.digest)) throw Error('Approval must match the prepared application');
    if (status === 'submitted' && (!patch.confirmation?.verifiedAt || !patch.confirmation?.text || !old.approval)) throw Error('Verified confirmation and approval required');
    this.db.prepare('UPDATE jobs SET payload=?,status=?,updated=? WHERE id=?').run(JSON.stringify({...old,...patch}),status,now(),id);
    this.event(id,status,note); return this.get(id);
  }
  exportCSV() {
    const cols=['id','company','role','salary','location','eligibility','score','url','status','updated'];
    const cell = v => '"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
    return [cols,...this.list().map(j=>cols.map(c=>c==='score'?j.match?.score:j[c]))].map(row=>row.map(cell).join(',')).join('\r\n');
  }
}
export const skills = {
  'Node.js': /\bnode(?:\.js|js)?\b/i, React:/\breact(?:\.js|js)?\b/i, 'Next.js':/\bnext(?:\.js|js)\b/i,
  TypeScript:/\btypescript\b/i, JavaScript:/\bjavascript\b/i, SQL:/\bSQL\b/i, PostgreSQL:/\bpostgres(?:ql)?\b/i,
  MongoDB:/\bmongodb\b/i, Express:/\bexpress(?:\.js|js)?\b/i, NestJS:/\bnest(?:\.js|js)\b/i,
  Docker:/\bdocker\b/i, AWS:/\baws\b/i, Git:/\bgit\b/i, Tailwind:/\btailwind\b/i,
  Python:/\bpython\b/i, Redis:/\bredis\b/i, GraphQL:/\bgraphql\b/i, 'React Native':/\breact native\b/i,
  tRPC:/\btrpc\b/i, SST:/\bsst\b/i, Drizzle:/\bdrizzle\b/i, Flutter:/\bflutter\b/i,
};
export function match(job, profile) {
  const rows = (job.requirements || []).map(r => {
    const fact = profile.facts.find(f => skills[r.skill]?.test(f.quote));
    return {...r, matched:!!fact, evidence:fact ? {page:fact.page,quote:fact.quote} : null};
  });
  const total = rows.reduce((s,r)=>s+(r.weight||1),0);
  const score=total?Math.round(100*rows.filter(r=>r.matched).reduce((s,r)=>s+(r.weight||1),0)/total):null;
  return {score,rows,method:'Weighted coverage of explicitly listed technical requirements only. Not a hiring probability. Years, degree, seniority and eligibility require separate review.',gaps:rows.filter(r=>!r.matched).map(r=>r.skill), cautions:job.cautions||[]};
}
export function loadProfile() {
  const p = JSON.parse(readFileSync(resolve(DATA,'profile.json'),'utf8'));
  if (hash(readFileSync(p.cvPath)) !== p.cvHash) throw Error('CV changed. Import and review the profile again.');
  const pages=JSON.parse(readFileSync(resolve(DATA,'cv-pages.json'),'utf8'));
  for (const f of p.facts) if (!pages[f.page-1]?.includes(f.quote)) throw Error('Profile evidence does not occur in the CV');
  const links=JSON.parse(readFileSync(resolve(DATA,'cv-links.json'),'utf8'));
  const source=pages.join('\n')+'\n'+links.map(l=>l.url).join('\n');
  for (const [key,value] of Object.entries(p.fields||{})) if(value && !source.includes(value)) throw Error(`Field ${key} is not an exact CV fact`);
  return p;
}
export function nextMonth(applicationDate = new Date()) {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit'}).formatToParts(applicationDate);
  const year=Number(parts.find(p=>p.type==='year').value),month=Number(parts.find(p=>p.type==='month').value);
  return `${month===12?year+1:year}-${String(month===12?1:month+1).padStart(2,'0')}-01`;
}
export function preferenceAnswers(job, preferences, date=new Date()) {
  if(!preferences)return {};
  const country=job.employerCountryVerified?job.employerCountry:null;
  const key=country==='Egypt'?'Egypt':['Saudi Arabia','United Arab Emirates'].includes(country)?'Saudi Arabia / UAE':country?'Other international':null;
  const salary=key?preferences.salaryMinimums[key]:null;
  return {source:'Explicit applicant instructions; separate from CV facts',calculatedAt:date.toISOString(),
    availability:`Available from ${nextMonth(date)} (first day of the next calendar month; recalculate on application date).`,
    salary:salary?`Minimum ${salary.currency} ${salary.monthly.toLocaleString('en-US')} per month (${salary.currency} ${(salary.monthly*12).toLocaleString('en-US')} annually).`:'Employer country not verified: choose the appropriate salary rule manually.',
    salaryRules:preferences.salaryMinimums,
    sponsorship:preferences.remoteSponsorship,
    manualReview:'Local work authorization, relocation, and the employer’s legal ability to hire in Egypt must be reviewed by the applicant. No automatic currency conversion.'};
}
export function prepare(job, p) {
  if (job.policy === 'manual-only') throw Error('Employer policy requires human-written application. No draft generated.');
  if (job.verification?.state !== 'active' || !fresh(job.verification.at)) throw Error('Verify the original opening within 24 hours first');
  const matched=match(job,p);
  const quotes=[...new Set(matched.rows.filter(r=>r.matched).map(r=>r.evidence.quote))].slice(0,3);
  if (!quotes.length) throw Error('No CV evidence supports the listed requirements');
  const cover=`Dear ${job.company} hiring team,\n\nI am applying for the ${job.role} position. The following experience from my CV is relevant to the role:\n\n${quotes.map(q=>'- '+q).join('\n')}\n\nI would welcome the opportunity to discuss how this background fits your team.\n\nKind regards,\n${p.fields.fullName || ''}`;
  const answers={...p.fields,coverLetter:cover};
  const prefPath=resolve(DATA,'preferences.json');
  const suggestedAnswers=preferenceAnswers(job,existsSync(prefPath)?JSON.parse(readFileSync(prefPath,'utf8')):null);
  const digest=hash(JSON.stringify({url:job.url,answers,suggestedAnswers,cvHash:p.cvHash}));
  return {match:matched,prepared:{at:now(),digest,cvHash:p.cvHash,answers,suggestedAnswers,coverLetter:cover,evidence:matched.rows.filter(r=>r.matched),missing:['Confirm employer country and salary question currency/period','Review local work authorization, relocation or hiring legality questions','Any required questions not evidenced by the CV or explicit preferences']}};
}
export function saveJSON(path, data) { mkdirSync(dirname(path),{recursive:true}); writeFileSync(path,JSON.stringify(data,null,2)); }
