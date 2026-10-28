const {chromium}=require('playwright');const assert=require('node:assert/strict');const http=require('node:http');
const url='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-inactive-runner-qa?name=letter-identification';
(async()=>{
const fetched=await fetch(url);assert.equal(fetched.status,200);const raw=await fetched.text();
const server=http.createServer((q,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(raw)});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const local='http://127.0.0.1:'+server.address().port+'/';const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{for(const size of [{width:1024,height:768},{width:1366,height:768},{width:1440,height:900}]){
const page=await browser.newPage({viewport:size});let errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.COMPASS_CONTEXT={studentId:'synthetic-letter',studentCompassProgramId:'synthetic-letter-assignment',assignmentId:'synthetic-letter-assignment',behaviors:['Noncompliance'],iepGoals:[{id:'letter-goal',title:'Synthetic Goal'}],instanceConfig:{}};
window.__qaCalls=[];window.__deny=false;window.__COMPASS_STUDENT_RUNTIME__={context:{student_id:'synthetic-letter',assignment_id:'synthetic-letter-assignment',primary_behaviors:['Noncompliance'],iep_goals:[{id:'letter-goal',title:'Synthetic Goal'}],targets:[]},securePost:async p=>{window.__qaCalls.push({action:p.action,...p});if(window.__deny)throw Error('synthetic denial');if(p.action==='load_mastery')return{ok:true,target_name:p.target_name,qualifying_dates:0,minimum_dates:3,mastered:false};if(p.action==='save_setup')return {ok:true,programSetup:p.setup};if(p.action==='save_probe')return {ok:true,probe_saved:true,probe_id:'probe-mock'};throw Error('unexpected securePost')},saveSession:async p=>{window.__qaCalls.push({action:'save_session',...p});if(window.__deny)throw Error('synthetic denial');return {ok:true,session_id:'synthetic-saved',saved_trial_events:p.trial_events.length}}};});
await page.goto(local,{waitUntil:'domcontentloaded',timeout:30000});
const cfg=await page.evaluate(()=>JSON.parse(document.getElementById('compassConfig').textContent));assert.equal(cfg.targets.length,78);assert.equal(cfg.benchmarks.length,8);assert.equal(cfg.kind,'letter_identification');
assert.equal(await page.locator('#benchmarkSelect option').count(),8,'setup initialization '+errors);
for(let b=1;b<=8;b++){await page.locator('#benchmarkSelect').selectOption(String(b));assert.equal(await page.locator('#targetSelect option').count(),[6,6,6,8,13,13,13,13][b-1],'benchmark '+b);}
await page.locator('#benchmarkSelect').selectOption('1');await page.locator('#skillSelect').selectOption('Receptive');await page.locator('#chainSelect').selectOption('TTTTT');
await page.locator('#runBtn').click();assert.equal(await page.locator('#runPage').evaluate(e=>e.classList.contains('active')),true);
const cards=await page.locator('#taskStage .stim-card').count();assert(cards>=2,'Receptive must show letter characters');
assert.equal(await page.locator('#runPage [data-score="correct"]').isEnabled(),true);
for(let i=0;i<5;i++){await page.locator('#runPage [data-score="correct"]').click();await page.locator('#saveNextBtn').click();}
await page.waitForFunction(()=>window.__qaCalls.some(x=>x.action==='save_session'),null,{timeout:6000});
const saved=await page.evaluate(()=>window.__qaCalls.find(x=>x.action==='save_session'));assert.equal(saved.trial_events.length,5);assert.equal(saved.counts.independent_correct,5);
assert.equal(await page.locator('#nextProgramBtn').isEnabled(),true);
await page.locator('#backBtn').click();await page.evaluate(()=>window.__deny=true);await page.locator('#runBtn').click();
for(let i=0;i<5;i++){await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click();}
await page.waitForFunction(()=>document.getElementById('validation').textContent.includes('save failed'),null,{timeout:6000});
assert.equal(await page.locator('#nextProgramBtn').isHidden(),true);await page.evaluate(()=>window.__deny=false);await page.locator('#saveNextBtn').click();
await page.waitForFunction(()=>!document.getElementById('nextProgramBtn').disabled,null,{timeout:6000});
assert.equal(errors.length,0,errors.join('\n'));console.log('PASS Letter Identification',size.width,'markers','8 benchmarks','78 targets','5 steps','save-reject-retry');await page.close();
}}finally{await browser.close();await new Promise(ok=>server.close(ok))}
})().catch(e=>{console.error(e);process.exit(1)});
