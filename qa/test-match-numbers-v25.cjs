const {chromium}=require('playwright'),assert=require('node:assert/strict'),http=require('node:http');
const u='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-inactive-runner-qa?name=match-numbers';
(async()=>{const fetched=await fetch(u);assert.equal(fetched.status,200);const html=await fetched.text(),server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html)});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{for(const size of [{width:1024,height:768},{width:1366,height:768},{width:1440,height:900}]){
const page=await browser.newPage({viewport:size});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.COMPASS_CONTEXT={studentId:'synthetic-number',studentCompassProgramId:'synthetic-number-assignment',assignmentId:'synthetic-number-assignment',behaviors:['Noncompliance'],iepGoals:[{id:'number-goal',title:'Synthetic Goal'}],instanceConfig:{}};window.__calls=[];window.__deny=false;window.__COMPASS_STUDENT_RUNTIME__={context:{student_id:'synthetic-number',assignment_id:'synthetic-number-assignment',primary_behaviors:['Noncompliance'],iep_goals:[{id:'number-goal',title:'Synthetic Goal'}],targets:[]},securePost:async p=>{window.__calls.push(p);if(window.__deny)throw Error('Synthetic denial');if(p.action==='load_mastery')return {ok:true,target_name:p.target_name,qualifying_dates:0,minimum_dates:3,mastered:false};if(p.action==='save_setup')return{ok:true,programSetup:p.setup};if(p.action==='save_probe')return{ok:true,probe_saved:true,probe_id:'mock-probe'};throw Error('Unexpected action')},saveSession:async p=>{window.__calls.push({action:'save_session',...p});if(window.__deny)throw Error('Synthetic denial');return{ok:true,session_id:'mock-session',saved_trial_events:p.trial_events.length}}};});
await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
const C=await page.evaluate(()=>JSON.parse(document.getElementById('compassConfig').textContent));assert.equal(C.targets.length,100);assert.equal(C.benchmarks.length,5);assert.equal(C.kind,'number_match');
assert.equal(await page.locator('#stimulusSelect option').count(),5);assert.equal(await page.locator('#mnDistractorAction option').count(),9);
for(let b=1;b<=5;b++){await page.locator('#benchmarkSelect').selectOption(String(b));assert.equal(await page.locator('#targetSelect option').count(),20,'range '+b);}
await page.locator('#benchmarkSelect').selectOption('5');await page.locator('#targetSelect').selectOption('100');await page.locator('#chainSelect').selectOption('T');
await page.locator('#runBtn').click();assert.equal(await page.locator('.mn-dot').count(),100);assert((await page.locator('#taskStage .stim-card').count())>=2);
await page.locator('.mn-dot').first().click();assert.equal(await page.locator('.mn-dot').first().getAttribute('aria-pressed'),'true');
await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click();await page.waitForFunction(()=>window.__calls.some(x=>x.action==='save_session'),null,{timeout:7000});
assert.equal(await page.locator('#nextProgramBtn').isEnabled(),true);await page.locator('#backBtn').click();await page.evaluate(()=>{window.__calls=[]});
await page.locator('#benchmarkSelect').selectOption('1');await page.locator('#targetSelect').selectOption('3');await page.locator('#stimulusSelect').selectOption('Cars');await page.locator('#chainSelect').selectOption('TTTTT');
await page.locator('#runBtn').click();assert.equal(await page.locator('.mn-dot').count(),3);
for(let i=0;i<5;i++){await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click();}
await page.waitForFunction(()=>window.__calls.some(x=>x.action==='save_session'),null,{timeout:7000});
const save=await page.evaluate(()=>window.__calls.find(x=>x.action==='save_session'));assert.equal(save.trial_events.length,5);assert.equal(save.counts.independent_correct,5);
await page.locator('#backBtn').click();await page.evaluate(()=>{window.__deny=true});await page.locator('#runBtn').click();
for(let i=0;i<5;i++){await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click();}
await page.waitForFunction(()=>document.getElementById('validation').textContent.includes('save failed'),null,{timeout:7000});
assert.equal(await page.locator('#nextProgramBtn').isHidden(),true);await page.evaluate(()=>{window.__deny=false});await page.locator('#saveNextBtn').click();
await page.waitForFunction(()=>!document.getElementById('nextProgramBtn').disabled,null,{timeout:7000});
assert.equal(errors.length,0,errors.join(' '));console.log('PASS Match Numbers',size.width,'100 targets','5 ranges','100 objects','five-step chain','save retry');await page.close();
}}finally{await browser.close();await new Promise(ok=>server.close(ok))}})().catch(e=>{console.error(e);process.exit(1)});
