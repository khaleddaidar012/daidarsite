import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { DATA, now, loadProfile, fresh } from './core.mjs';

export async function preparationGate(context, isApproved) {
  const gate={blockedWrites:0};
  await context.route('**/*',async route=>{
    if(!isApproved() && !['GET','HEAD','OPTIONS'].includes(route.request().method())) {gate.blockedWrites++;await route.abort('blockedbyclient');}
    else await route.continue();
  });
  return gate;
}

export async function launch(headless=false) {
  // Use installed Edge on Windows; no profile, login cookies, stealth or extensions.
  return chromium.launch({headless, ...(process.platform === 'win32'?{channel:'msedge'}:{})});
}
export function blocker(text) {
  if (/no longer accepting|no longer available|position (?:has been )?filled|job (?:is )?closed|job not found/i.test(text)) return 'Opening closed';
  if (/only my own words|AI.{0,40}(?:disqualif|prohibit)|(?:no|not allow).{0,20}(?:automated applications|AI.generated)/i.test(text)) return 'Employer prohibits generated applications';
  if (/verify you are human|unusual traffic|access denied|checking your browser|sign in to (?:apply|continue)/i.test(text)) return 'Access control requires manual action';
  return null;
}
export async function inspect(page) {
  const text = await page.locator('body').innerText();
  let reason=blocker(text);
  if (await page.locator('input[type=password]').count()) reason='Login restriction: manual action required';
  if (await page.locator('iframe[src*="recaptcha"],iframe[src*="hcaptcha"],iframe[src*="challenges.cloudflare"],.g-recaptcha,.h-captcha,[name="cf-turnstile-response"]').count()) reason='CAPTCHA present: manual action required';
  return {text,reason};
}
export async function verify(job) {
  const browser = await launch(true);
  try {
    const page=await browser.newPage();
    const response=await page.goto(job.url,{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForFunction(title=>document.body?.innerText.toLowerCase().includes(title.toLowerCase()),job.role,{timeout:12000}).catch(()=>{});
    const {text,reason}=await inspect(page);
    const exactRole=text.toLowerCase().includes(job.role.toLowerCase());
    const apply=await page.getByRole('link',{name:/apply/i}).count()+await page.getByRole('button',{name:/apply|submit application/i}).count();
    const state=response?.ok() && exactRole && apply && !reason?'active':'needs-manual-action';
    return {state,at:now(),url:page.url(),httpStatus:response?.status(),reason:reason||(!exactRole?'Role title not verified':!apply?'No application entry found':state==='active'?'Role title and application entry present':'HTTP failure'), excerpt:text.slice(0,1200)};
  } finally {await browser.close();}
}
const fieldLabels = {
  fullName:/^(full name|name)\s*\*?$/i, firstName:/^first name\s*\*?$/i,lastName:/^last name\s*\*?$/i,
  email:/^email(?: address)?\s*\*?$/i,phone:/^(?:phone|phone number)\s*(?:\(optional\))?\s*\*?$/i,
  linkedin:/^(?:linkedin|linkedin (?:url|profile))\s*\*?$/i, github:/^(?:github|github (?:url|profile))\s*\*?$/i,
  portfolio:/^(?:portfolio|portfolio url|website)\s*\*?$/i,coverLetter:/^cover letter\s*\*?$/i,
};
export async function fillSupported(page, answers, cvPath) {
  const result={filled:[],missing:[],uploaded:false};
  const check=await inspect(page); if(check.reason) return {...result,blocked:check.reason};
  for(const [key,re] of Object.entries(fieldLabels)) {
    const target=page.getByLabel(re);
    if(await target.count()!==1 || !await target.isVisible() || !await target.isEditable()) continue;
    const type=await target.getAttribute('type');
    if(![null,'text','email','tel','url'].includes(type)) continue;
    if(!answers[key]) {result.missing.push(key);continue;}
    await target.fill(answers[key]);result.filled.push(key);
  }
  // File field must explicitly identify a CV. Never use the first file input (it may request ID/photo).
  const resume=page.getByLabel(/^(?:resume|resume\/cv|cv|upload (?:resume|cv))\s*\*?$/i);
  if(await resume.count()===1 && await resume.getAttribute('type')==='file') {
    await resume.setInputFiles(cvPath);result.uploaded=true;
  }
  const missing=await page.locator('input:required,textarea:required,select:required').evaluateAll(els=>els.filter(e=>!e.disabled && (e.type==='checkbox'?!e.checked:e.type==='file'?!e.files.length:!e.value)).map(e=>e.labels?.[0]?.textContent?.trim()||e.name||'Unlabelled required field'));
  result.missing.push(...missing);return result;
}
export async function applicationSession(tracker,id,ask) {
  const job=tracker.get(id), profile=loadProfile();
  if(job.status!=='prepared' || !job.prepared) throw Error('Prepare this job before opening it');
  if(job.policy!=='reviewed-allowed') throw Error('Review employer/ATS terms and record policy before automated filling');
  if(job.prepared.cvHash!==profile.cvHash) throw Error('CV changed: prepare again');
  if(!fresh(job.verification?.at)) throw Error('Verification expired');
  const browser=await launch(false);
  let approved=false;
  try {
    const context=await browser.newContext({serviceWorkers:'block'});
    // Fail closed: form scripts cannot submit in the preparation phase. No upload endpoint is silently trusted.
    const gate=await preparationGate(context,()=>approved);
    const page=await context.newPage();
    await page.goto(job.applicationUrl||job.url,{waitUntil:'domcontentloaded',timeout:45000});
    await page.locator('input,textarea').first().waitFor({state:'attached',timeout:12000}).catch(()=>{});
    if(new URL(page.url()).origin!==new URL(job.applicationUrl||job.url).origin) throw Error('Unexpected origin; review manually');
    const result=await fillSupported(page,job.prepared.answers,profile.cvPath);
    mkdirSync(resolve(DATA,'reviews'),{recursive:true});
    await page.screenshot({path:resolve(DATA,'reviews',`${id}.png`),fullPage:true});
    if(result.blocked || result.missing.length || gate.blockedWrites || !result.filled.length) {
      tracker.save(id,{formReview:result},'needs-manual-action',result.blocked||`Review required: ${result.missing.join(', ')}; ${gate.blockedWrites} write requests blocked. Upload may not have reached server.`);
      console.log(JSON.stringify(result,null,2));
      await ask('Manual action needed. No submission allowed in this session. Press Enter to close. ');return;
    }
    console.log(`Review ${job.company} / ${job.role} in the browser. No final button has been clicked.`);
    const reply=await ask(`Explicit approval required: type APPROVE ${id} to permit YOUR manual final submission, or Enter to cancel: `);
    if(reply!==`APPROVE ${id}`) {tracker.save(id,{},'needs-manual-action','Approval not granted');return;}
    tracker.save(id,{approval:{digest:job.prepared.digest,at:now()}},'approved','User explicitly approved this application in terminal');
    const before=(await inspect(page)).text;
    approved=true;
    await ask('You may now click the final submit button yourself. After confirmation appears, press Enter here to verify: ');
    const {text,reason}=await inspect(page);
    const confirmation=text.match(/(?:thank you for (?:applying|your application)|your application (?:has been|was) (?:successfully )?(?:submitted|received)|application submitted successfully)/i)?.[0];
    if(!reason && confirmation && !before.includes(confirmation) && new URL(page.url()).origin===new URL(job.applicationUrl||job.url).origin) {
      await page.screenshot({path:resolve(DATA,'reviews',`${id}-confirmation.png`),fullPage:true});
      tracker.save(id,{confirmation:{verifiedAt:now(),url:page.url(),text:confirmation}},'submitted','New employer confirmation observed after approval');
    } else tracker.save(id,{},'needs-manual-action','Submission unconfirmed; do not retry without checking employer receipt');
  } catch(error) {tracker.save(id,{},'needs-manual-action',error.message);throw error;}
  finally {await browser.close();}
}
