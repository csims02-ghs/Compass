const {chromium}=require('playwright'),assert=require('node:assert/strict'),http=require('node:http');
const url='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-inactive-runner-qa?name=number-tracing';
(async()=>{const r=await fetch(url);assert.equal(r.status,200);const html=await r.text(),server=http.createServer((q,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html)});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{for(const size of [{width:1024,height:768},{width:1366,height:768},{width:1440,height:900}]){
const page=await browser.newPage({viewport:size}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.COMPASS_CONTEXT={studentId:'synthetic',studentCompassProgramId:'synthetic-assignment',assignmentId:'synthetic-assignment',behaviors:['Noncompliance'],iepGoals:[{id:'g',title:'Synthetic Goal'}],instanceConfig:{}};window.__calls=[];window.__deny=false;window.__COMPASS_STUDENT_RUNTIME__={context:{student_id:'synthetic',assignment_id:'synthetic-assignment',primary_behaviors:['Noncompliance'],iep_goals:[{id:'g',title:'Synthetic Goal'}],targets:[]},securePost:async p=>{window.__calls.push({action:p.action,...p});if(window.__deny)throw Error('Denied');if(p.action==='load_mastery')return{ok:true,target_name:p.target_name,qualifying_dates:0,minimum_dates:3,mastered:false};if(p.action==='save_setup')return {ok:true,programSetup:p.setup};if(p.action==='save_probe')return{ok:true,probe_saved:true,probe_id:'mock-probe'};throw Error('Unknown action')},saveSession:async p=>{window.__calls.push({action:'save_session',...p});if(window.__deny)throw Error('Denied');return{ok:true,session_id:'mock-session',saved_trial_events:p.trial_events.length}}};});
await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
const C=await page.evaluate(()=>JSON.parse(document.getElementById('compassConfig').textContent));assert.equal(C.targets.length,100);assert.equal(C.benchmarks.length,10);assert.equal(C.kind,'number_tracing');
for(let b=1;b<=10;b++){await page.locator('#benchmarkSelect').selectOption(String(b));assert.equal(await page.locator('#targetSelect option').count(),[5,5,10,20,20,20,20,20,100,9][b-1],'benchmark '+b);}
assert((await page.locator('#setupHint').textContent()).includes('Target 0 is not in the registered library'));
await page.locator('#benchmarkSelect').selectOption('9');await page.locator('#skillSelect').selectOption('Finger Trace Number');await page.locator('#targetSelect').selectOption('100');await page.locator('#chainSelect').selectOption('T');await page.locator('#runBtn').click();
await page.locator('#lfWritingCanvas').waitFor();assert((await page.locator('#taskStage').innerText()).includes('100'));
await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click();await page.waitForFunction(()=>window.__calls.some(x=>x.action==='save_session'),null,{timeout:7000});
await page.locator('#backBtn').click();await page.evaluate(()=>window.__calls=[]);
await page.locator('#benchmarkSelect').selectOption('1');await page.locator('#materialSelect').selectOption('written');await page.locator('#chainSelect').selectOption('T');await page.locator('#runBtn').click();
assert.equal(await page.locator('#lfWritingCanvas').count(),0,'Paper mode must not show canvas');await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click();
await page.waitForFunction(()=>window.__calls.some(x=>x.action==='save_session'),null,{timeout:7000});await page.locator('#backBtn').click();await page.evaluate(()=>window.__calls=[]);
await page.locator('#materialSelect').selectOption('picture');await page.locator('#skillSelect').selectOption('Write Number From Memory');await page.locator('#chainSelect').selectOption('T');await page.locator('#runBtn').click();
assert.equal(await page.locator('.nt-guide').count(),0,'Memory mode must hide numeral model');await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click();
await page.waitForFunction(()=>window.__calls.some(x=>x.action==='save_session'),null,{timeout:7000});await page.locator('#backBtn').click();await page.evaluate(()=>window.__calls=[]);
await page.locator('#skillSelect').selectOption('Finger Trace Number');await page.locator('#chainSelect').selectOption('TTTTT');await page.locator('#runBtn').click();
for(let i=0;i<5;i++){await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click()}
await page.waitForFunction(()=>window.__calls.some(x=>x.action==='save_session'),null,{timeout:7000});
const save=await page.evaluate(()=>window.__calls.find(x=>x.action==='save_session'));assert.equal(save.trial_events.length,5);assert.equal(save.counts.independent_correct,5);
await page.locator('#backBtn').click();await page.evaluate(()=>window.__deny=true);await page.locator('#runBtn').click();
for(let i=0;i<5;i++){await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click()}
await page.waitForFunction(()=>document.getElementById('validation').textContent.includes('save failed'),null,{timeout:7000});assert.equal(await page.locator('#nextProgramBtn').isHidden(),true);
await page.evaluate(()=>window.__deny=false);await page.locator('#saveNextBtn').click();await page.waitForFunction(()=>!document.getElementById('nextProgramBtn').disabled,null,{timeout:7000});
assert.equal(errors.length,0,errors.join(' '));console.log('PASS Number Tracing',size.width,'100 targets','10 benchmark paths','optional zero correctly excluded','paper/memory/canvas','five-step IEP','save retry');await page.close();
}}finally{await browser.close();await new Promise(ok=>server.close(ok))}})().catch(e=>{console.error(e);process.exit(1)});
