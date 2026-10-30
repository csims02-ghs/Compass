'use strict';
// Native Functions V25 validation: active Supabase runner + synthetic authorized save transport.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const url='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-program-runner?program_code=CP-DIR-VISUAL-087&test=1';
(async()=>{
 const response=await fetch(url,{signal:AbortSignal.timeout(40000)});
 assert.equal(response.status,200,'Functions live runner unavailable');
 const html=await response.text();
 const match=html.match(/<script id="compassConfig" type="application\/json">([\s\S]*?)<\/script>/);
 assert(match,'Native Functions embedded config missing');
 const cfg=JSON.parse(match[1]);
 assert.equal(cfg.benchmarks.length,5);
 assert.equal(cfg.targets.length,50);
 assert.equal(cfg.targets.filter(t=>Number(t.benchmark)===5).length,10);
 assert.equal(cfg.targets.filter(t=>Number(t.benchmark)<=4).length,40);
 const win={};
 vm.runInNewContext(read('compass-page2-standard.js'),{window:win,fetch:async()=>{throw Error('Native runner must not load deprecated adapter')}});
 assert.equal(await win.COMPASS_PAGE2_STANDARD.standardize(html),html,'Native runner must remain native; no legacy adapter overlay');
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
 try{
  for(const view of [{width:1024,height:768},{width:1440,height:900}]){
   const page=await browser.newPage({viewport:view});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   page.on('dialog',dialog=>dialog.accept());
   await page.addInitScript(({targets})=>{
     window.__QA_SAVES__=[];
     window.__COMPASS_STUDENT_RUNTIME__={
       context:{assignment_id:'qa-functions-assignment',student_id:'qa-functions-student',
         targets:targets.map(t=>({id:'qa-'+t.id,target_key:String(t.id),target_name:t.name})),
         primary_behaviors:['Leaving area','Property destruction'],iep_goals:[],instance_config:{}},
       securePost:async req=>{window.__QA_SAVES__.push(req);
         if(req.action==='save_setup')return{ok:true,saved:true,programSetup:req.setup};
         if(req.action==='save_probe')return{ok:true,probe_saved:true,probe_id:'qa-verbal-probe'};
         return{ok:true,saved:true};},
       saveSession:async payload=>{window.__QA_SAVES__.push({action:'save_session',payload});
         return{ok:true,session_id:'qa-functions-session',saved_trial_events:payload.trial_events?.length||0};}
     };
   },{targets:cfg.targets});
   await page.route('**/compass-program-runner?*',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>document.querySelector('#benchmarkSelect')?.options.length===5,null,{timeout:15000});
   assert.equal(await page.locator('#benchmarkSelect option').count(),5);
   await page.locator('#benchmarkSelect').selectOption('5');
   assert.equal(await page.locator('#targetSelect option').count(),10,'B5 must have 10 targets');
   const firstCue=await page.locator('#targetSelect option').first().textContent();
   await page.locator('#chainSelect').selectOption('T');
   await page.locator('#runBtn').click();
   await page.locator('#runPage.active').waitFor({timeout:15000});
   const details=await page.evaluate(()=>{
     const target=document.querySelector('#functionsVerbalStaffCue')?.querySelector('p')?.textContent||'';
     const learner=document.querySelector('#runPage .material-card')?.textContent||'';
     const gate=document.querySelector('#actionsMaterialsGate');
     const material=document.querySelector('#runPage .material-card')?.getBoundingClientRect();
     const scoring=document.querySelector('#runPage .score-card')?.getBoundingClientRect();
     return{target,learner,gateText:gate?.textContent||'',
       staffVisible:document.querySelector('#functionsVerbalStaffCue')?.hidden===false,
       icon:document.querySelector('#sdPrompt')?.textContent,ratio:material.width/(material.width+scoring.width),
       overflow:document.documentElement.scrollWidth>innerWidth+2};
   });
   assert(details.staffVisible,'Staff spoken direction must be visible');
   assert(details.target.length>10&&details.target===firstCue,'Staff cue must match the selected target');
   assert(!details.learner.includes(details.target),'Never reveal the spoken SD in student-facing material');
   assert.equal(details.icon,'🔊');
   assert(details.gateText.includes('Spoken direction delivered'),'B5 needs verbal-specific verification');
   assert(details.ratio>.62&&details.ratio<.76,'V25 70/30 split changed');
   assert.equal(details.overflow,false,'Viewport has horizontal overflow');
   assert.equal(await page.locator('[data-score="correct"]').first().isDisabled(),true,'Must deliver spoken cue before scoring');
   await page.locator('#actionsVerifyMaterialsBtn').click();
   await page.locator('[data-score="correct"]').first().click();
   await page.locator('#saveNextBtn').click();
   await page.waitForFunction(()=>window.__QA_SAVES__.some(x=>x.action==='save_session'),{timeout:15000});
   const teaching=await page.evaluate(()=>({run:window.COMPASS_REVIEW_TEST.getRun(),saved:window.__QA_SAVES__.filter(x=>x.action==='save_session')}));
   assert.equal(teaching.run.events.length,1);
   assert.equal(teaching.run.events[0].instruction_delivery,'verbal_only');
   assert.equal(teaching.saved[0].payload.v25_run.instruction_delivery,'verbal_only');
   assert.equal(teaching.saved[0].payload.trial_events.length,1);
   await page.locator('#backBtn').click();
   await page.locator('#benchmarkSelect').selectOption('1');
   assert.equal(await page.locator('#targetSelect option').count(),10,'Original B1 missing');
   await page.locator('#runBtn').click();
   assert.equal(await page.locator('#functionsVerbalStaffCue').isHidden(),true,'Staff-only B5 cue leaked into B1');
   const normal=await page.locator('#sdPrompt').textContent();
   assert.notEqual(normal,'🔊','Original written/visual benchmark changed');
   await page.locator('#backBtn').click();
   await page.locator('#benchmarkSelect').selectOption('5');
   await page.locator('#circuitSelect').selectOption('probe');
   await page.locator('#runBtn').click();
   assert.equal(await page.evaluate(()=>window.COMPASS_REVIEW_TEST.getRun().steps.length),10);
   for(let i=0;i<10;i++){
     await page.locator('#actionsVerifyMaterialsBtn').click();
     await page.locator('[data-score="correct"]').first().click();
     await page.locator('#saveNextBtn').click();
     await page.waitForFunction(n=>window.COMPASS_REVIEW_TEST.getRun().events.length>=n,i+1,{timeout:12000});
   }
   await page.waitForFunction(()=>window.__QA_SAVES__.some(x=>x.action==='save_probe'),{timeout:15000});
   const probed=await page.evaluate(()=>({saves:window.__QA_SAVES__.filter(x=>x.action==='save_probe'),
     run:window.COMPASS_REVIEW_TEST.getRun()}));
   assert.equal(probed.saves.length,1);
   assert.equal(probed.saves[0].benchmark_key,'5');
   assert.equal(probed.saves[0].events.length,10);
   assert.equal(new Set(probed.saves[0].events.map(x=>x.target_name)).size,10);
   assert.equal(probed.run.events.filter(x=>x.instruction_delivery==='verbal_only').length,10);
   assert.deepEqual(errors,[],'Browser page errors: '+errors.join('|'));
   console.log('FUNCTIONS_VERBAL_B5_NATIVE_PASS',JSON.stringify({view,benchmarks:5,targets:50,verbalTargets:10,staffOnly:true,modalitySaved:true,probeSaved:true,ratio:details.ratio,overflow:false}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('FUNCTIONS_VERBAL_B5_NATIVE_FAIL',e);process.exitCode=1});
