const {chromium}=require('playwright'),assert=require('node:assert/strict'),http=require('node:http');
const url='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-program-runner?program_code=CP-GREETINGS-NET&format=html';
(async()=>{
 const r=await fetch(url);assert.equal(r.status,200);const html=await r.text();const server=http.createServer((q,res)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html)});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 for(const width of [1024,1366,1440]){
 const page=await browser.newPage({viewport:{width,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.COMPASS_CONTEXT={studentId:'synthetic',studentCompassProgramId:'synthetic-assignment',assignmentId:'synthetic-assignment',behaviors:['Noncompliance'],iepGoals:[{id:'goal1',title:'Greet peers'}],instanceConfig:{}};window.__calls=[];window.__deny=false;window.__COMPASS_STUDENT_RUNTIME__={context:{student_id:'synthetic',assignment_id:'synthetic-assignment',primary_behaviors:['Noncompliance'],iep_goals:[{id:'goal1',title:'Greet peers'}],targets:[]},securePost:async p=>{window.__calls.push({action:p.action,...p});if(window.__deny)throw Error('Synthetic failure');if(p.action==='load_mastery')return{ok:true,target_name:p.target_name,qualifying_dates:0,minimum_dates:3,mastered:false};if(p.action==='save_setup')return{saved:true,programSetup:p.setup};if(p.action==='save_probe')return{probe_saved:true,probe_id:'fake'};throw Error('Unexpected action')},saveSession:async p=>{window.__calls.push({action:'save_session',...p});if(window.__deny)throw Error('Synthetic failure');return{ok:true,session_id:'fake-session',saved_trial_events:p.trial_events.length}}};});
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
 await page.locator('#chainSelect').selectOption('TTTTT');
 assert((await page.locator('.chain-preview-heading strong').innerText()).includes('IEP Chain'));
 assert.equal(await page.locator('.chain-step.is-target').count(),5);
 const steps=['correct','prompted','incorrect','correct','correct'];
 await page.locator('#modeSelect').selectOption('teaching');
 await page.locator('#runBtn').click();
 for(let i=0;i<5;i++){
  assert((await page.locator('#trialLabel').innerText()).includes('Step '+(i+1)+'/5'),'Step label '+i);
  if(i===1)await page.locator('#greetPromptSelect').selectOption('Model');
  await page.locator('[data-score="'+steps[i]+'"]').click();
  await page.locator('#saveNextBtn').click();
  if(i<4)assert((await page.locator('#trialLabel').innerText()).includes('Step '+(i+2)+'/5'),'Step progression '+i);
 }
 await page.waitForFunction(()=>window.__calls.some(x=>x.action==='save_session'),null,{timeout:7000});
 const saved=await page.evaluate(()=>window.__calls.find(x=>x.action==='save_session'));
 assert.equal(saved.trial_events.length,5);assert.deepEqual(saved.trial_events.map(x=>x.trial_number),[1,2,3,4,5]);
 assert.equal(saved.counts.independent_correct,3);assert.equal(saved.counts.prompted_correct,1);assert.equal(saved.counts.incorrect,1);
 assert.equal(saved.v25_run.greeting_steps.length,5);assert.deepEqual(saved.v25_run.greeting_steps.map(x=>x.mode),['DTI','DTI','DTI','DTI','DTI']);
 assert.equal(await page.locator('#nextProgramBtn').isEnabled(),true);
 console.log('PASS IEP 5 DTI steps',width);
 await page.locator('#backBtn').click();await page.evaluate(()=>window.__calls=[]);
 await page.locator('#modeSelect').selectOption('generalization');
 await page.locator('#runBtn').click();
 for(let i=0;i<5;i++){
  assert((await page.locator('#trialLabel').innerText()).includes('Step '+(i+1)+'/5'));
  await page.locator('#greetCueSelect').selectOption('Yes');
  await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click();
 }
 await page.waitForFunction(()=>window.__calls.some(x=>x.action==='save_session'),null,{timeout:7000});
 const net=await page.evaluate(()=>window.__calls.find(x=>x.action==='save_session'));
 assert.equal(net.trial_events.length,5);assert.equal(net.v25_run.greeting_steps.length,5);
 assert.equal(net.v25_run.net_generalization,true);
 assert.equal(await page.locator('#nextProgramBtn').isEnabled(),true);
 console.log('PASS IEP 5 NET steps',width);
 await page.close();
 }
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
})().catch(e=>{console.error(e);process.exit(1)});
