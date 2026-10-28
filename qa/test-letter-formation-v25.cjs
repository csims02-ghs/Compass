const {chromium}=require('playwright'); const assert=require('node:assert/strict');
const url='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-inactive-runner-qa?name=letter-formation';
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{for(const viewport of [{width:1024,height:768},{width:1366,height:768},{width:1440,height:900}]){
const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
window.COMPASS_CONTEXT={studentId:'synthetic-student',studentCompassProgramId:'synthetic-assignment',assignmentId:'synthetic-assignment',
behaviors:['Noncompliance'],iepGoals:[{id:'synthetic-goal',title:'Synthetic IEP Goal'}],instanceConfig:{}};
window.__qaCalls=[];window.__deny=false;
window.__COMPASS_STUDENT_RUNTIME__={context:{student_id:'synthetic-student',assignment_id:'synthetic-assignment',primary_behaviors:['Noncompliance'],iep_goals:[{id:'synthetic-goal',title:'Synthetic IEP Goal'}],targets:[]},
securePost:async p=>{window.__qaCalls.push(p);if(window.__deny)throw Error('Rejected synthetic save');if(p.action==='load_mastery')return {ok:true,target_name:p.target_name,qualifying_dates:0,minimum_dates:3,mastered:false};if(p.action==='save_setup')return {ok:true,saved:true,programSetup:p.setup};if(p.action==='save_probe')return {ok:true,probe_saved:true,probe_id:'synthetic-probe'};return {ok:false}},
saveSession:async p=>{window.__qaCalls.push({action:'save_session',...p});if(window.__deny)throw Error('Rejected synthetic save');return {ok:true,session_id:'synthetic-session',saved_trial_events:p.trial_events.length}}};
});
const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:40000});assert.equal(response.status(),200);
await page.setContent(Buffer.from(await response.body()).toString('utf8'),{waitUntil:'domcontentloaded'}); if(!(await page.locator('#benchmarkSelect option').count()))await page.evaluate(()=>window.dispatchEvent(new Event('DOMContentLoaded'))); console.log('QA_PARSED',await page.title(),'errors',errors,'benchmarkOptions',await page.locator('#benchmarkSelect option').count()); const cfg=await page.evaluate(()=>JSON.parse(document.getElementById('compassConfig').textContent));
assert.equal(cfg.targets.length,52);assert.equal(cfg.benchmarks.length,10);assert.equal(cfg.kind,'writing');
assert.equal(await page.locator('#setupPage').count(),1);assert.equal(await page.locator('#runPage').count(),1);
const chains=await page.locator('#chainSelect option').evaluateAll(xs=>xs.map(x=>[x.value,x.textContent]));assert(chains.some(([v,t])=>v==='TTTTT'&&t.includes('IEP Chain')));
assert.equal(await page.locator('#benchmarkSelect option').count(),10,'benchmark initialization failed '+JSON.stringify(errors)); for(let b=1;b<=10;b++){await page.locator('#benchmarkSelect').selectOption(String(b)); const count=await page.locator('#targetSelect option').count();assert.equal(count,[6,6,6,8,6,6,6,8,26,26][b-1], 'benchmark '+b);}
await page.locator('#benchmarkSelect').selectOption('1');await page.locator('#chainSelect').selectOption('TTTTT');await page.locator('#runBtn').click();await page.locator('#lfWritingCanvas').waitFor({timeout:8000});
assert.equal(await page.locator('#runPage').evaluate(e=>e.classList.contains('active')),true);
assert.equal(await page.locator('[data-score="correct"]').isEnabled(),true,'writing scoring available');
for(let i=0;i<5;i++){await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click();}
await page.waitForFunction(()=>window.__qaCalls.some(x=>x.action==='save_session'),{timeout:8000});
const saved=await page.evaluate(()=>window.__qaCalls.find(x=>x.action==='save_session'));assert.equal(saved.trial_events.length,5);
assert.equal(saved.counts.independent_correct,5);assert.equal(await page.locator('#nextProgramBtn').isEnabled(),true);
assert.equal(errors.length,0,errors.join('\n'));
console.log('PASS',viewport.width,'benchmarks 10','targets 52','IEP 5 steps','auth mock saved',saved.trial_events.length);
await page.close();
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
