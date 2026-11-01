# Personal Job Application Agent

Local Node.js 24 + Playwright application assistant for Windows. SQLite is built into Node; no database service or paid AI key is needed. The separate dashboard binds only to `127.0.0.1:4317`. This tool does not change or deploy the Daidar website.

## Start on Windows

Install Node.js 24 LTS and Microsoft Edge, then double-click `Start-Job-Agent.cmd`. Or, in PowerShell:

```powershell
cd 'C:\MyFiles\web development\daidar_site_2\daidar-solutions\tools\job-agent'
npm ci --cache .cache/npm
npm start
```

Visit http://127.0.0.1:4317. Stop with Ctrl+C. On other platforms run `npm run browser:install` once. The Windows browser uses installed Edge in a fresh, temporary profile, never your existing authenticated profile.

## First five workflow

```powershell
npm run cli -- import-cv 'C:\path\to\your-cv.pdf'
npm run cli -- import-jobs initial-jobs.json
npm run cli -- verify all
npm run cli -- prepare all
npm run cli -- list
npm run cli -- export
```

Import writes PDF text, embedded link annotations, a source hash, and a profile into ignored `data/`. Review `data/profile.json` before preparing. `fields` supports `fullName`, `firstName`, `lastName`, `email`, `phone`, `linkedin`, `github`, `portfolio`. Values must occur in the CV text or its embedded links. Do not use unrelated repository content as experience evidence. Do not add invented facts. Reimporting replaces the profile; back it up locally first if edited.

Evidence facts must be exact quotations with page numbers. Matching measures weighted technical-requirement coverage, not overall hiring fit or years of experience. Missing facts remain missing. Drafts use extractive CV quotations; no external model receives your CV. Salary expectations, notice period, sponsorship, travel, screening answers, consent and sensitive information remain for the applicant to enter manually.

Explicit user preferences are kept separately in ignored `data/preferences.json`. Prepared drafts display salary rules, availability calculated for the first day of the next calendar month using Cairo time, and the narrow remote-work sponsorship statement. They are review suggestions, not automatic field entries. Salary selection requires `employerCountry` plus `employerCountryVerified: true` on the job; otherwise all rules are shown for manual selection. No exchange rate is guessed. Re-prepare on the actual application date, particularly across month boundaries. Local authorization, relocation and employer hiring legality remain manual questions.

The initial research contains **five leads, not five guaranteed suitable jobs**. Bask's junior role is the strongest sector/level lead. The second Bask role needs level review; Stllr and SOUM are stretches because their required years are not evidenced. Canonical is manual-only because its form forbids generated content. No Egypt salary was published in the researched listings. Do not interpret a high technical coverage score as satisfying experience, academics, work authorization or contractual requirements.

## Review and prepare an actual form

1. Read the original job, employer identity, ATS terms and application requirements. If assisted filling is prohibited or unclear, use the site manually. A successful page load alone is not an endorsement of the company or permission to automate.
2. Record your policy review: `npm run cli -- review-policy JOB_ID`. Explicit manual-only employers cannot be overridden with this command.
3. Run `npm run cli -- open JOB_ID` in an interactive terminal. The application must be prepared, its CV unchanged, and original-page verification less than 24 hours old.
4. Playwright opens a fresh browser, fills only exact supported labels and attaches the CV only to a clearly labelled CV input. Unknown/custom fields, dropdowns, legal consents and sensitive fields are not guessed. It never presses Enter or clicks a final button.
5. All non-read HTTP requests are blocked during preparation. If an ATS requires background uploads/autosave, the run stops as `needs-manual-action`; attaching a file is not proof the server received it. No write endpoint is broadly whitelisted. This deliberately limits generic ATS support.
6. Any CAPTCHA/login/anti-bot challenge stops automation. No solving, evasion, stealth, account creation, password entry or login persistence is implemented.
7. Review the visible form. If fully supported, the terminal requests the exact phrase `APPROVE JOB_ID`. Approval is tied to that draft and this browser session. Only then are writes enabled, and **you click final submit yourself**. Approval alone does not mark it submitted.
8. After submitting, press Enter in the terminal. The tool requires newly appearing employer confirmation text on the expected origin and saves a confirmation screenshot. Otherwise the outcome is `needs-manual-action`; check your receipt before attempting another application.

There is no unattended submit command, dashboard submit endpoint, bulk approval, CAPTCHA solver or automatic retry after an ambiguous outcome. Screenshots and logs may contain personal information; all stay in ignored `data/`. A new session never reuses an approval. Closing a browser or failing verification does not imply submission.

## Discovery and maintenance

`sources.example.json` documents public Lever/Greenhouse feeds. Verify company ownership and applicable terms, copy to `data/sources.json`, set reviewed sources to `true`, then run:

```powershell
npm run cli -- discover data/sources.json
```

Discovery imports up to five keyword-relevant leads per source, with eligibility and policy **unverified**. It is not an internet-wide crawler. Add other company career pages or job-board leads using an array in a local JSON file and `import-jobs`; preserve the original application URL, actual salary currency/period, eligibility evidence and gaps. Review extracted requirement lists before scoring: keyword presence does not distinguish required, alternative and preferred skills. Never treat a board's “remote” tag as worldwide permission.

Re-run verification immediately before preparing. Closed pages, missing title/application controls, HTTP failures and access restrictions are not verified active. JavaScript-dependent pages may need manual verification; this tool does not retry aggressively. Exact canonical URLs prevent duplicate records (tracking parameters and `/apply` removed); cross-postings with different URLs still require manual review. Same-employer different roles are separate records.

`data/tracker.sqlite` is authoritative. `events` stores transitions and notes. `applications.csv` is an export with spreadsheet formula escaping. Back up the entire data folder privately. Do not commit it, email it, serve it publicly or put it in cloud hosting.

## Checks

```powershell
npm test
```

Tests cover URL duplicates, truthful evidence, missing skills, policy/staleness guards, approval and confirmation requirements, CSV injection, localhost/origin restrictions, supported fields, CV attachment and sensitive/login-field handling. Browser tests use synthetic data only and never submit to an employer. They demonstrate supported mechanics, not a successful real application.

Implementation: `src/core.mjs` (tracker and evidence), `discovery.mjs` (ATS feeds), `browser.mjs` (verification and supervised filling), `cli.mjs` (workflow), `server.mjs` and `public/` (local dashboard). Extend support with reviewed, site-specific adapters and tests; do not weaken the final approval or request-blocking rules to increase application count.
