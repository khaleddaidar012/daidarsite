const fs=require('fs'),assert=require('node:assert/strict'),ts=require('typescript'),{DatabaseSync}=require('node:sqlite');
function load(file,deps={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>deps[n]||require(n),m,m.exports);return m.exports}
const db=new DatabaseSync(':memory:'); db.exec(`CREATE TABLE employees(id TEXT PRIMARY KEY,monthly_salary_piasters INTEGER,max_monthly_hours REAL); INSERT INTO employees VALUES('e',300000,104);`);
db.exec(fs.readFileSync('migrations/0023_hourly_payroll_rates.sql','utf8'));
const env={DB:{prepare(sql){let args=[];return{bind(...v){args=v;return this},async all(){return{results:db.prepare(sql).all(...args)}}}}}};
const lib=load('functions/lib/employees.ts',{'./store':{}}),employee={id:'e',name:'Test',job_title:'Test',active:1,created_at:Date.parse('2026-01-01T00:00:00Z'),monthly_salary_piasters:300000,weekly_days_off:'[4,5]',max_daily_hours:4,max_monthly_hours:104,work_schedule_locked:1,work_schedule_effective_day:'2026-10-01'};
(async()=>{
assert.equal((await lib.withHourlyRates(env,[employee],'2026-10'))[0].payroll_hourly_rate_piasters,undefined,'old months retain original payroll');
assert.equal((await lib.withHourlyRates(env,[employee],'2026-11'))[0].payroll_hourly_rate_piasters,2885,'other employees retain their implied hourly rate');
db.prepare('UPDATE employee_hourly_rates SET rate_piasters=3500 WHERE employee_id=?').run('e');
db.prepare('INSERT INTO employee_hourly_rates VALUES(?,?,?,?)').run('e','2026-12',4000,0);
const nov=(await lib.withHourlyRates(env,[employee],'2026-11'))[0],dec=(await lib.withHourlyRates(env,[employee],'2026-12'))[0];assert.equal(nov.payroll_hourly_rate_piasters,3500);assert.equal(dec.payroll_hourly_rate_piasters,4000);assert.equal((await lib.withHourlyRates(env,[employee],'2027-01'))[0].payroll_hourly_rate_piasters,4000);
const shifts=[{id:'a',employee_id:'e',day:'2026-11-07',check_in:Date.parse('2026-11-07T08:00:00Z'),check_out:Date.parse('2026-11-07T13:30:00Z')}];
const calc=(attendance,now=Date.parse('2026-11-18T12:00:00Z'))=>lib.calculatePayroll([nov],attendance,[{employee_id:'e',day:'2026-11-08',type:'leave',status:'approved'}],'2026-11',now)[0];
assert.equal(calc([]).due_piasters,0,'schedule days and leave do not invent worked hours');assert.equal(calc(shifts).actual_hours,5.5,'display and payment use all actual hours, even beyond old caps');assert.equal(calc(shifts).due_piasters,19250);
const snapshot=calc(shifts),bonus=100000-snapshot.due_piasters;assert.equal(lib.adjustedPayrollDue(snapshot.due_piasters,{due_piasters:100000,adjustment_piasters:bonus}),100000);assert.equal(lib.adjustedPayrollDue(snapshot.due_piasters+3500,{due_piasters:100000,adjustment_piasters:bonus}),103500,'bonus is fixed, further work keeps earning');
const overnight=[{id:'b',employee_id:'e',day:'2026-11-17',check_in:Date.parse('2026-11-17T21:00:00Z'),check_out:null}];assert.equal(calc(overnight,Date.parse('2026-11-18T01:00:00Z')).actual_hours,4,'open overnight shift counts');
const tiny=[{id:'c',employee_id:'e',day:'2026-11-07',check_in:1000,check_out:61000}];assert.equal(calc(tiny).due_piasters,58,'money rounds once to piasters');
assert.equal(lib.checkInSchedule(nov,Date.parse('2026-11-18T12:00:00Z')).allowed,false,'payroll policy does not unlock work windows');
console.log('Passed hourly payroll: historical rates, future carry-forward, actual hours, overnight, piasters, bonus top-up, schedule separation.');
})().catch(e=>{console.error(e);process.exitCode=1});
