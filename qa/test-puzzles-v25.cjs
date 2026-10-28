const {chromium}=require('playwright'),assert=require('node:assert/strict'),http=require('node:http');
(async()=>{
const u='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-inactive-runner-qa?name=puzzles',response=await fetch(u);assert.equal(response.status,200);const html=await response.text();
const server=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html)});await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{for(const width of [1024,1366,1440]){
 const page=await browser.newPage({viewport:{width,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.COMPASS_CONTEXT={studentId:'s',studentCompassProgramId:'a',assignmentId:'a',instanceConfig:{}};window.calls=[];window.deny=false;window.__COMPASS_STUDENT_RUNTIME__={context:{student_id:'s',assignment_id:'a',targets:[]},securePost:async p=>({ok:true,probe_saved:true,programSetup:p.setup}),saveSession:async p=>{window.calls.push(p);if(window.deny)throw Error('mock reject');return{ok:true,session_id:'demo',saved_trial_events:p.trial_events.length}}};});
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('#benchmarkSelect option').count(),5,errors.join(';'));
 for(let b=1;b<=5;b++){await page.locator('#benchmarkSelect').selectOption(String(b));assert.equal(await page.locator('#targetSelect option').count(),[12,1,1,1,1][b-1]);}
 await page.locator('#benchmarkSelect').selectOption('1');await page.locator('#skillSelect').selectOption('Digital Puzzle');await page.locator('#chainSelect').selectOption('TTTTT');await page.locator('#runBtn').click();
 assert.equal(await page.locator('.puz-slot').count(),12);assert.equal(await page.locator('[data-piece]').count(),1);
 async function place(){const piece=page.locator('[data-piece]').first(),id=await piece.getAttribute('data-piece');await piece.click();await page.locator('[data-slot="'+id+'"]').click()}
 await place();for(let i=0;i<5;i++){if(i>0)await place();await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click()}
 await page.waitForFunction(()=>window.calls.length>0,null,{timeout:6000});const s=await page.evaluate(()=>window.calls[0]);assert.equal(s.trial_events.length,5);assert.equal(s.v25_run.puzzle_steps.length,5);
 await page.locator('#backBtn').click();await page.locator('#benchmarkSelect').selectOption('5');await page.locator('#chainSelect').selectOption('T');await page.locator('#runBtn').click();assert.equal(await page.locator('.puz-slot').count(),24);assert.equal(await page.locator('[data-piece]').count(),24);
 assert((await page.locator('.puz-piece').first().evaluate(e=>e.style.backgroundImage)).includes('data:image/svg+xml'));
 await page.locator('#puzEndAttempt').click();await page.locator('[data-score="incorrect"]').click();await page.locator('#saveNextBtn').click();
 await page.locator('#backBtn').click();await page.locator('#skillSelect').selectOption('Physical Manipulatives');await page.locator('#runBtn').click();
 assert.equal(await page.locator('.puz-slot').count(),0);await page.locator('#puzPhysicalConfirm').click();await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click();
 await page.locator('#backBtn').click();await page.evaluate(()=>{window.deny=true});await page.locator('#runBtn').click();await page.locator('#puzPhysicalConfirm').click();await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click();
 await page.waitForFunction(()=>document.getElementById('validation').textContent.includes('save failed'),null,{timeout:6000});assert.equal(await page.locator('#nextProgramBtn').isHidden(),true);await page.evaluate(()=>{window.deny=false});await page.locator('#saveNextBtn').click();await page.waitForFunction(()=>!document.getElementById('nextProgramBtn').disabled,null,{timeout:6000});
 assert.equal(errors.length,0,errors.join(';'));console.log('PASS Puzzles',width,'16 targets','5 benchmarks','SVG','24 pieces','physical mode','save retry');await page.close();
}}finally{await browser.close();await new Promise(ok=>server.close(ok))}
})().catch(e=>{console.error(e);process.exit(1)});
