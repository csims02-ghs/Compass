const {chromium}=require('playwright');const assert=require('node:assert/strict');const http=require('node:http');
const url='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-inactive-runner-qa?name=letter-matching';
(async()=>{const res=await fetch(url);assert.equal(res.status,200);const html=await res.text();const server=http.createServer((req,r)=>{r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end(html)});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{for(const size of [{width:1024,height:768},{width:1366,height:768},{width:1440,height:900}]){
const page=await browser.newPage({viewport:size}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.COMPASS_CONTEXT={studentId:'synthetic',studentCompassProgramId:'synthetic-assignment',assignmentId:'synthetic-assignment',behaviors:['Noncompliance'],iepGoals:[{id:'g',title:'Synthetic Goal'}],instanceConfig:{}};window.__qaCalls=[];window.__deny=false;window.__COMPASS_STUDENT_RUNTIME__={context:{student_id:'synthetic',assignment_id:'synthetic-assignment',primary_behaviors:['Noncompliance'],iep_goals:[{id:'g',title:'Synthetic Goal'}],targets:[]},securePost:async p=>{window.__qaCalls.push(p);if(window.__deny)throw Error('Synthetic denied');if(p.action==='load_mastery')return {ok:true,target_name:p.target_name,qualifying_dates:0,minimum_dates:3,mastered:false};if(p.action==='save_setup')return {ok:true,programSetup:p.setup};if(p.action==='save_probe')return {ok:true,probe_saved:true,probe_id:'probe-mock'};throw Error('Unknown secure action')},saveSession:async p=>{window.__qaCalls.push({action:'save_session',...p});if(window.__deny)throw Error('Synthetic denied');return{ok:true,session_id:'mock-saved',saved_trial_events:p.trial_events.length}}};});
await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
const C=await page.evaluate(()=>JSON.parse(document.getElementById('compassConfig').textContent));assert.equal(C.targets.length,26);assert.equal(C.benchmarks.length,5);
assert.equal(await page.locator('#benchmarkSelect option').count(),5,errors.join(' '));
for(let i=1;i<=5;i++){await page.locator('#benchmarkSelect').selectOption(String(i));assert.equal(await page.locator('#targetSelect option').count(),[6,6,6,8,26][i-1])}
assert.equal(await page.locator('#letterCaseSelect option').count(),4);
await page.locator('#benchmarkSelect').selectOption('1');
for(const [type,shouldSample] of [['Letter → Letter',true],['Sound → Letter',false],['Letter → Sound',true]]){
await page.locator('#skillSelect').selectOption(type);await page.locator('#chainSelect').selectOption('T');
await page.locator('#runBtn').click();const n=await page.locator('#taskStage .stim-card').count();assert(n>=2,type+' must present interactive choices');
const txt=await page.locator('#taskStage').innerText();if(shouldSample)assert(txt.includes('Match this letter'));else assert(txt.includes('Listen'));
assert.equal(await page.locator('[data-score="correct"]').isEnabled(),true);await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click();await page.waitForFunction(()=>window.__qaCalls.some(x=>x.action==='save_session'),null,{timeout:6000});
assert.equal(await page.locator('#nextProgramBtn').isEnabled(),true);await page.locator('#backBtn').click();await page.evaluate(()=>{window.__qaCalls=[]});}
await page.locator('#skillSelect').selectOption('Letter → Letter');await page.locator('#letterCaseSelect').selectOption('Uppercase → Lowercase');await page.locator('#chainSelect').selectOption('TTTTT');await page.locator('#runBtn').click();
for(let i=0;i<5;i++){await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click()}
await page.waitForFunction(()=>window.__qaCalls.some(x=>x.action==='save_session'),null,{timeout:6000});
const save=await page.evaluate(()=>window.__qaCalls.find(x=>x.action==='save_session'));assert.equal(save.trial_events.length,5);
await page.locator('#backBtn').click();await page.evaluate(()=>{window.__deny=true});await page.locator('#runBtn').click();
for(let i=0;i<5;i++){await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click()}
await page.waitForFunction(()=>document.getElementById('validation').textContent.includes('save failed'),null,{timeout:6000});
assert.equal(await page.locator('#nextProgramBtn').isHidden(),true);await page.evaluate(()=>{window.__deny=false});await page.locator('#saveNextBtn').click();await page.waitForFunction(()=>!document.getElementById('nextProgramBtn').disabled,null,{timeout:6000});
assert.equal(errors.length,0,errors.join(' '));console.log('PASS Letter Matching',size.width,'26 targets','5 benchmarks','3 matching modes','4 case modes','5-step chain','failed-save retry');await page.close();
}}finally{await browser.close();await new Promise(ok=>server.close(ok))}})().catch(e=>{console.error(e);process.exit(1)});
