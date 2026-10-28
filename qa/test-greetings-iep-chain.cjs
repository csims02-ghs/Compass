const {chromium}=require('playwright'),assert=require('node:assert/strict'),http=require('node:http');
const url='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-inactive-runner-qa?name=greetings-net';
(async()=>{
 const r=await fetch(url);assert.equal(r.status,200);const html=await r.text();const server=http.createServer((q,res)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html)});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 for(const width of [1024,1366,1440]){
 const page=await browser.newPage({viewport:{width,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.COMPASS_CONTEXT={studentId:'synthetic',studentCompassProgramId:'synthetic-assignment',assignmentId:'synthetic-assignment',behaviors:['Noncompliance'],iepGoals:[{id:'goal1',title:'Greet peers'}],instanceConfig:{}};window.__calls=[];window.__deny=false;window.__COMPASS_STUDENT_RUNTIME__={context:{student_id:'synthetic',assignment_id:'synthetic-assignment',primary_behaviors:['Noncompliance'],iep_goals:[{id:'goal1',title:'Greet peers'}],targets:[]},securePost:async p=>{window.__calls.push({action:p.action,...p});if(window.__deny)throw Error('Synthetic failure');if(p.action==='load_mastery')return{ok:true,target_name:p.target_name,qualifying_dates:0,minimum_dates:3,mastered:false};if(p.action==='save_setup')return{saved:true,programSetup:p.setup};if(p.action==='save_probe')return{probe_saved:true,probe_id:'fake'};throw Error('Unexpected action')},saveSession:async p=>{window.__calls.push({action:'save_session',...p});if(window.__deny)throw Error('Synthetic failure');return{ok:true,session_id:'fake-session',saved_trial_events:p.trial_events.length}}};});
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('#modeSelect').inputValue(),'generalization');
 await page.locator('#chainSelect').selectOption('TTTTT');
 assert.equal(await page.locator('#modeSelect').inputValue(),'teaching','IEP Chain must select DTI Practice to avoid NET-only scoring lock');
 assert((await page.locator('#setupHint').innerText()).includes('five separately scored T steps'));
 await page.locator('#goalSelect').selectOption('goal1');
 await page.locator('#saveSetupBtn').click();
 await page.waitForFunction(()=>window.__calls.some(x=>x.action==='save_setup'),null,{timeout:5000});
 const cfg=await page.evaluate(()=>window.__calls.find(x=>x.action==='save_setup'));
 assert.equal(cfg.setup.chainSelect,'TTTTT');assert.equal(cfg.setup.modeSelect,'teaching');assert.equal(cfg.setup.goalSelect,'goal1');
 assert((await page.locator('.chain-preview-heading strong').innerText()).includes('IEP Chain'));
 assert.equal(await page.locator('.chain-step.is-target').count(),5);
 const steps=['correct','prompted','incorrect','correct','correct'];
 await page.locator('#runBtn').click();
 assert((await page.locator('#saveNextBtn').innerText()).includes('Next IEP Step'));
 assert.equal((await page.locator('#trialLabel').innerText()).includes('Step 1/5'),true);
 for(let i=0;i<5;i++){
  assert((await page.locator('#trialLabel').innerText()).includes('Step '+(i+1)+'/5'),'Step label '+i);
  if(i===1)await page.locator('#greetPromptSelect').selectOption('Model');
  await page.locator('[data-score="'+steps[i]+'"]').click();
  await page.locator('#saveNextBtn').click();
  if(i<4)assert((await page.locator('#trialLabel').innerText()).includes('Step '+(i+2)+'/5'),'Step progression '+i);
  if(i===4)assert((await page.locator('#saveNextBtn').innerText()).includes('Completed & Saved'));
 }
 await page.waitForFunction(()=>window.__calls.some(x=>x.action==='save_session'),null,{timeout:7000});
 const saved=await page.evaluate(()=>window.__calls.find(x=>x.action==='save_session'));
 assert.equal(saved.trial_events.length,5);assert.deepEqual(saved.trial_events.map(x=>x.trial_number),[1,2,3,4,5]);
 assert.equal(saved.counts.independent_correct,3);assert.equal(saved.counts.prompted_correct,1);assert.equal(saved.counts.incorrect,1);
 assert.equal(saved.v25_run.greeting_steps.length,5);
 assert.equal(saved.goal_id,'goal1');assert.equal(saved.v25_run.iep_chain,true);assert.equal(saved.v25_run.chain_pattern,'TTTTT');assert.equal(saved.v25_run.expected_steps,5);assert.equal(saved.v25_run.completed_steps,5);
 assert(saved.trial_events.every(x=>x.trial_type==='T'));assert.deepEqual(saved.v25_run.greeting_steps.map(x=>x.mode),['DTI','DTI','DTI','DTI','DTI']);
 assert.equal(await page.locator('#nextProgramBtn').isEnabled(),true);
 console.log('PASS IEP 5 DTI steps',width);
 await page.locator('#backBtn').click();await page.evaluate(()=>window.__calls=[]);
 assert.equal(await page.locator('#chainSelect').inputValue(),'TTTTT');
 await page.locator('#modeSelect').selectOption('generalization');
 await page.locator('#runBtn').click();
 assert((await page.locator('#saveNextBtn').innerText()).includes('Next IEP Step'),'New run should not retain Completed & Saved label');
 assert.equal(await page.locator('[data-score="correct"]').isDisabled(),true,'NET without a confirmed cue is intentionally locked');
 for(let i=0;i<5;i++){
  assert((await page.locator('#trialLabel').innerText()).includes('Step '+(i+1)+'/5'));
  await page.locator('#greetCueSelect').selectOption('Yes');
  await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click();
 }
 await page.waitForFunction(()=>window.__calls.some(x=>x.action==='save_session'),null,{timeout:7000});
 const net=await page.evaluate(()=>window.__calls.find(x=>x.action==='save_session'));
 assert.equal(net.trial_events.length,5);assert.equal(net.v25_run.greeting_steps.length,5);
 assert.equal(net.v25_run.net_generalization,true);assert.equal(net.v25_run.iep_chain,true);assert.equal(net.v25_run.expected_steps,5);
 assert.equal(await page.locator('#nextProgramBtn').isEnabled(),true);
 console.log('PASS IEP 5 NET steps',width);
 await page.locator('#backBtn').click();await page.evaluate(()=>{window.__deny=true;window.__calls=[]});
 await page.locator('#runBtn').click();await page.locator('#greetNoOpportunity').click();
 assert((await page.locator('#trialLabel').innerText()).includes('Step 1/5'),'No Opportunity must not count as a trial');
 for(let i=0;i<5;i++){await page.locator('#greetCueSelect').selectOption('Yes');await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click();}
 await page.waitForFunction(()=>document.querySelector('#validation')?.textContent.includes('save failed'),null,{timeout:7000});
 assert.equal(await page.locator('#nextProgramBtn').isHidden(),true,'Next Program must stay locked when save fails');
 await page.evaluate(()=>{window.__deny=false});await page.locator('#saveNextBtn').click();
 await page.waitForFunction(()=>!document.getElementById('nextProgramBtn').disabled,null,{timeout:7000});
 const recovered=await page.evaluate(()=>window.__calls.find(x=>x.action==='save_session'));
 assert.equal(recovered.trial_events.length,5);assert.equal(recovered.v25_run.no_natural_opportunities.length,1);
 assert.equal(errors.length,0,errors.join('; '));
 console.log('PASS IEP 5-step failed-save and retry',width);
 await page.close();
 }
 }finally{await browser.close();await new Promise(ok=>server.close(ok))}
})().catch(e=>{console.error(e);process.exit(1)});
