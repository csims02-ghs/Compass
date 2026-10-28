const {chromium}=require('playwright'),assert=require('node:assert/strict'),http=require('node:http');
(async()=>{
const url=process.env.RUNNER_URL||'https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-inactive-runner-qa?name=actions-material-gate';
const r=await fetch(url);assert.equal(r.status,200,'QA runner endpoint');const html=await r.text();
const server=http.createServer((_req,res)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html)});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{for(const width of [1024,1366,1440]){
 const page=await browser.newPage({viewport:{width,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.COMPASS_CONTEXT={studentId:'qa-synthetic',studentCompassProgramId:'qa-assignment',assignmentId:'qa-assignment',instanceConfig:{},behaviors:[]};window.__qa=[];window.__COMPASS_STUDENT_RUNTIME__={context:{student_id:'qa-synthetic',assignment_id:'qa-assignment',targets:[]},securePost:async p=>({ok:true,probe_saved:true,programSetup:p.setup}),saveSession:async p=>{window.__qa.push(p);return{ok:true,session_id:'synthetic',saved_trial_events:p.trial_events.length}}};});
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
 await page.locator('#materialSelect').selectOption('real');await page.locator('#chainSelect').selectOption('TTTT');
 await page.locator('#runBtn').click();
 assert.equal(await page.locator('#actionsMaterialsGate').count(),1,'Gate displayed before verification');
 assert.equal(await page.locator('#actionsMaterialsGate').isVisible(),true,'Gate visible');
 assert.equal(await page.locator('[data-score="correct"]').isDisabled(),true,'Scoring gated until verified');
 await page.locator('#actionsVerifyMaterialsBtn').click();
 assert.equal(await page.locator('#actionsMaterialsGate').count(),0,'Whole gate must be removed immediately, no blank space');
 assert.equal(await page.locator('[data-score="correct"]').isEnabled(),true,'Staff now allowed to score');
 await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click();
 assert.equal(await page.locator('#actionsMaterialsGate').count(),1,'Next instructional step requires fresh verification');
 assert.equal(await page.locator('#actionsMaterialsGate').isVisible(),true);
 assert.equal(await page.locator('[data-score="correct"]').isDisabled(),true);
 for(let i=1;i<4;i++){
  await page.locator('#actionsVerifyMaterialsBtn').click();
  assert.equal(await page.locator('#actionsMaterialsGate').count(),0,'Gate removed at step '+(i+1));
  await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click();
 }
 await page.waitForFunction(()=>window.__qa.length>0,null,{timeout:10000});
 const saved=await page.evaluate(()=>window.__qa[0]);
 assert.equal(saved.trial_events.length,4,'All 4 verified steps are saved');
 assert.equal(await page.locator('#nextProgramBtn').isEnabled(),true,'Navigation unlocked after confirmed save');
 assert.equal(errors.length,0,errors.join('; '));
 console.log('PASS Gate collapses and re-verifies on next step',width,'4 steps','saved');
 await page.close();
}}finally{await browser.close();await new Promise(ok=>server.close(ok))}
})().catch(e=>{console.error(e);process.exit(1)});
