'use strict';
const fs=require('node:fs'),p=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),root=p.resolve(__dirname,'..');
const read=x=>fs.readFileSync(p.join(root,x),'utf8');
const url='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-program-runner?program_code=CP-DIR-VISUAL-087&test=1';
(async()=>{
 const response=await fetch(url,{signal:AbortSignal.timeout(40000)});
 assert.equal(response.status,200);
 const raw=await response.text(),win={};
 vm.runInNewContext(read('compass-page2-standard.js'),{window:win,fetch:async x=>({ok:true,text:async()=>
  x.includes('body-parts-v25.css')?read('compass-body-parts-v25.css'):
  x.includes('functions-v25.css')?read('compass-functions-v25.css'):read('compass-functions-v25.js')})});
 const html=await win.COMPASS_PAGE2_STANDARD.standardize(raw);
 assert(html.includes('id="compass-functions-v25-logic"'),'Production Functions V25 not injected');
 assert.equal(await win.COMPASS_PAGE2_STANDARD.standardize(html),html,'Duplicate adapter');
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
 try{
  for(const view of [{width:1024,height:768},{width:1440,height:900}]){
   const page=await browser.newPage({viewport:view});
   await page.addInitScript(()=>{
    window.__QA_SAVES__=[];
    window.__COMPASS_STUDENT_RUNTIME__={
      context:{behaviors:['Noncompliance','Elopement','Aggression','Climbing','Refusal','Yelling','Disruption','Bolting']},
      securePost:async b=>{window.__QA_SAVES__.push(b);return b.action==='save_probe'?{ok:true,probe_saved:true}:{ok:true,saved:true};},
      autoSave:async reason=>{window.__QA_SAVES__.push({action:'save_session',reason,trial_events:window.__COMPASS_TRIAL_CAPTURE__.getEvents()});return {ok:true};}
    };
   });
   await page.route('**/compass-program-runner?*',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
   let errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   await page.locator('#bpRun').waitFor({timeout:12000});
   assert.equal(await page.locator('#funcBenchmark option').count(),4);
   assert.equal(await page.locator('#setupTarget option').count(),10);
   await page.locator('#funcBenchmark').selectOption('2');
   assert.equal(await page.locator('#setupTarget option').count(),10);
   await page.locator('#funcBenchmark').selectOption('0');
   await page.locator('#bpRun').click();
   await page.locator('#bpPageTwo').waitFor({state:'visible'});
   const metrics=await page.evaluate(()=>{const a=document.querySelector('#bpMaterial').getBoundingClientRect(),b=document.querySelector('#bpScoring').getBoundingClientRect(),n=document.querySelector('#behaviorItems');return {ratio:a.width/(a.width+b.width),behaviors:n.querySelectorAll('.behavior').length,scroll:n.scrollHeight>n.clientHeight,old:document.querySelector('#workspace').getBoundingClientRect().height};});
   console.log('FUNCTIONS_V25_DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>({context:window.__COMPASS_STUDENT_RUNTIME__?.context?.behaviors,exists:typeof setBehaviorDefinitions,defs:typeof behaviorDefinitions==='undefined'?null:behaviorDefinitions,container:document.getElementById('behaviorItems')?.outerHTML.slice(0,950),state:window.__COMPASS_FUNCTIONS_V25__?.getState()}))));
   assert(metrics.ratio>.60&&metrics.ratio<.76,'Page2 ratio '+JSON.stringify(metrics));
   assert.equal(metrics.behaviors,8);assert(metrics.scroll);assert.equal(metrics.old,0);
   await page.locator('#bpImages').click();
   assert((await page.locator('#bpImages').innerText()).includes('Exit'));
   await page.locator('#bpImages').click();
   const len=await page.evaluate(()=>plan.length);
   for(let i=0;i<len;i++){
    await page.locator(i%3===0?'#correctBtn':i%3===1?'#promptedBtn':'#incorrectBtn').click();
    await page.waitForFunction(n=>window.__COMPASS_FUNCTIONS_V25__.getState().events.length===n+1,i,{timeout:12000});
    if(i<len-1)await page.waitForFunction(n=>Number(trial)===n+1,i,{timeout:12000});
   }
   const state=await page.evaluate(()=>({r:window.__COMPASS_FUNCTIONS_V25__.getState(),s:window.__QA_SAVES__}));
   assert(state.r.complete&&state.r.saved,'Final autosave failed');
   assert.equal(state.s.filter(x=>x.action==='save_session').length,len);
   await page.locator('#bpBack').click();
   await page.locator('#funcCircuit').selectOption('probe');
   await page.locator('#bpRun').click();
   assert.equal(await page.evaluate(()=>plan.length),10);
   for(let i=0;i<10;i++){
    await page.locator('#correctBtn').click();
    if(i<9)await page.waitForFunction(n=>Number(trial)===n+1,i,{timeout:12000});
   }
   await page.waitForFunction(()=>window.__COMPASS_FUNCTIONS_V25__.getState().complete);
   const probe=await page.evaluate(()=>window.__QA_SAVES__.filter(x=>x.action==='save_probe'));
   assert.equal(probe.length,1);assert.equal(probe[0].events.length,10);
   assert.equal(new Set(probe[0].events.map(x=>x.target_name)).size,10);
   assert.deepEqual(errors,[]);
   console.log('FUNCTIONS_V25_STRESS_PASS',JSON.stringify({view,metrics,teachingSteps:len,probeTargets:10}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('FUNCTIONS_V25_STRESS_FAIL',e);process.exit(1)});
