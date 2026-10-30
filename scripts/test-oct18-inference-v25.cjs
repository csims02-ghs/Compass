'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const url='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-program-runner?program_code=CP-READ-INFER-095&test=1';
const ids=['appTitle','backBtn','resetViewBtn','runBtn','endBtn','nextProgramBtn',
'storageBanner','setupPage','selectedPill','setupFold','benchmarkSelect','targetSelect',
'probeTargetHelp','chainSelect','chainPreviewTitle','chainPreviewText','chainPreviewSteps',
'skillSelect','scoringSelect','arraySize','distractorSelect','goalSelect','masterySelect',
'materialSelect','modeSelect','trialsSelect','masteryTrialsSelect','minOpportunitiesSelect',
'circuitSelect','saveSetupStatus','saveSetupBtn','instructionsFold','runPage',
'runGrid','sdPrompt','taskStage','behaviorList','saveNextBtn'];
assert.equal(ids.length,38);
(async()=>{
 const response=await fetch(url,{signal:AbortSignal.timeout(40000)});
 assert.equal(response.status,200,'Live inference runner not served');
 const html=await response.text();
 const match=html.match(/<script id="compassConfig" type="application\/json">([\s\S]*?)<\/script>/);
 assert(match,'missing embedded V25 config');
 const cfg=JSON.parse(match[1]);
 assert.equal(cfg.targets.length,40);assert.equal(cfg.benchmarks.length,4);
 assert.equal(cfg.targets.filter(x=>x.benchmark===1).length,10);
 const js=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(m=>!m[1].includes('application/json'));
 for(const m of js)new Function(m[2]);
 const standard=fs.readFileSync(path.join(__dirname,'..','compass-page2-standard.js'),'utf8');
 const win={};vm.runInNewContext(standard,{window:win,fetch:async()=>{throw Error('Attempted legacy overlay on native V25 runner')}});
 assert.equal(await win.COMPASS_PAGE2_STANDARD.standardize(html),html,'Native V25 should not load legacy adapter');
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
 try{
  for(const view of [{width:1024,height:768},{width:1440,height:900}]){
   const page=await browser.newPage({viewport:view}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('dialog',d=>d.accept());
   await page.addInitScript(({targets})=>{
      window.__QA_SAVES__=[];
      window.__COMPASS_STUDENT_RUNTIME__={
       context:{assignment_id:'qa-inference-assignment',student_id:'qa-inference-student',
        targets:targets.map(t=>({id:'q-'+t.id,target_key:String(t.id),target_name:t.name})),
        primary_behaviors:['Leaving area','Property destruction'],iep_goals:[],instance_config:{}},
       securePost:async x=>{window.__QA_SAVES__.push(x);return x.action==='save_probe'?{ok:true,probe_saved:true,probe_id:'qa-probe'}:{ok:true,saved:true};},
       saveSession:async x=>{window.__QA_SAVES__.push({action:'save_session',payload:x});return{ok:true,session_id:'qa-saved',saved_trial_events:x.trial_events.length}}
      }
   },{targets:cfg.targets});
   await page.route('**/compass-program-runner?*',r=>r.fulfill({status:200,contentType:'text/html',body:html}));
   await page.goto(url,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#benchmarkSelect')?.options.length===4);
   const present=await page.evaluate(ids=>ids.filter(id=>!document.getElementById(id)),ids);
   assert.deepEqual(present,[],'Missing elements from locked reference');
   await page.locator('#benchmarkSelect').selectOption('1');
   assert.equal(await page.locator('#targetSelect option').count(),10);
   await page.locator('#chainSelect').selectOption('IEP_TTTTT');
   await page.locator('#saveSetupBtn').click();
   await page.waitForFunction(()=>window.__QA_SAVES__.some(x=>x.action==='save_setup'));
   await page.locator('#chainSelect').selectOption('T');
   await page.locator('#runBtn').click();
   await page.locator('#runPage.active').waitFor();
   const visual=await page.evaluate(()=>{
      const learner=document.querySelector('#runPage .material-card')?.textContent||'';
      const staff=document.querySelector('#functionsVerbalStaffCue')?.textContent||'';
      const m=document.querySelector('#runPage .material-card').getBoundingClientRect(),
        sc=document.querySelector('#runPage .score-card').getBoundingClientRect();
      return{learner,staff,ratio:m.width/(m.width+sc.width),overflow:document.documentElement.scrollWidth>innerWidth+2}
   });
   assert(visual.learner.includes('Maya frowned'),'Original story not visible');
   assert(visual.learner.includes('How might Maya feel'),'Original inference question not visible');
   assert(!visual.learner.includes('disappointed or upset'),'Expected answer leaked to learner');
   assert(visual.staff.includes('disappointed or upset'),'Expected answer missing from staff panel');
   assert(visual.ratio>.62&&visual.ratio<.76,'70/30 V25 split changed');
   assert(!visual.overflow,'Horizontal overflow');
   await page.locator('#actionsVerifyMaterialsBtn').click();
   await page.locator('[data-score="correct"]').first().click();
   await page.locator('#saveNextBtn').click();
   await page.waitForFunction(()=>window.__QA_SAVES__.some(x=>x.action==='save_session'));
   const teaching=await page.evaluate(()=>({run:window.COMPASS_REVIEW_TEST.getRun(),saves:window.__QA_SAVES__.filter(x=>x.action==='save_session')}));
   assert.equal(teaching.run.events.length,1);
   assert.equal(teaching.run.events[0].instruction_delivery,'passage_open_response');
   assert.equal(teaching.saves[0].payload.trial_events.length,1);
   assert(teaching.saves[0].payload.v25_run);
   await page.locator('#backBtn').click();
   await page.locator('#circuitSelect').selectOption('probe');
   await page.locator('#runBtn').click();
   assert.equal(await page.evaluate(()=>window.COMPASS_REVIEW_TEST.getRun().steps.length),10);
   for(let i=0;i<10;i++){
     await page.locator('#actionsVerifyMaterialsBtn').click();
     await page.locator('[data-score="correct"]').first().click();
     await page.locator('#saveNextBtn').click();
     await page.waitForFunction(n=>window.COMPASS_REVIEW_TEST.getRun().events.length>=n,i+1);
   }
   await page.waitForFunction(()=>window.__QA_SAVES__.some(x=>x.action==='save_probe'));
   const probe=await page.evaluate(()=>window.__QA_SAVES__.find(x=>x.action==='save_probe'));
   assert.equal(probe.events.length,10);
   assert.deepEqual(errors,[]);
   console.log('INFERENCE_NATIVE_V25_STRESS_PASS',JSON.stringify({view,markers:ids.length,benchmarks:4,targets:40,staffOnlyAnswer:true,probe:10,ratio:visual.ratio}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('INFERENCE_NATIVE_V25_STRESS_FAIL',e);process.exitCode=1});
