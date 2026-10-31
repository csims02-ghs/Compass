'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {chromium}=require('playwright');
const url='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-program-runner?program_code=CP-WH-CONCEPTS&qa=20261031';
const markers=['appTitle','backBtn','resetViewBtn','runBtn','endBtn','nextProgramBtn',
'storageBanner','setupPage','selectedPill','setupFold','benchmarkSelect','targetSelect',
'probeTargetHelp','chainSelect','chainPreviewTitle','chainPreviewText','chainPreviewSteps',
'skillSelect','scoringSelect','arraySize','distractorSelect','goalSelect','masterySelect',
'materialSelect','modeSelect','trialsSelect','masteryTrialsSelect','minOpportunitiesSelect',
'circuitSelect','saveSetupStatus','saveSetupBtn','instructionsFold','runPage',
'runGrid','sdPrompt','taskStage','behaviorList','saveNextBtn'];
assert.equal(markers.length,38);
(async()=>{
 const response=await fetch(url,{signal:AbortSignal.timeout(40000)});
 assert.equal(response.status,200,'WH live runner not returned');
 const html=await response.text();
 const cfgText=html.match(/<script id="compassConfig" type="application\/json">([\s\S]*?)<\/script>/);
 assert(cfgText,'native V25 WH config missing');
 const cfg=JSON.parse(cfgText[1]);
 assert.equal(cfg.code,'CP-WH-CONCEPTS');
 assert.equal(cfg.targets.length,900);
 assert.equal(cfg.scenes.length,25);
 assert.equal(cfg.benchmarks.length,4);
 assert.equal(new Set(cfg.targets.map(t=>t.key)).size,900);
 assert.equal(new Set(cfg.targets.map(t=>t.name)).size,200);
 for(const grade of ['K','1','2','3','4','5','6','7','8'])for(const b of [1,2,3,4]){
   assert.equal(cfg.targets.filter(t=>t.metadata?.grade===grade&&t.benchmark===b).length,25);
 }
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(m=>!m[1].includes('application/json'));
 scripts.forEach(m=>new Function(m[2]));
 const src=fs.readFileSync(path.resolve(__dirname,'../compass-page2-standard.js'),'utf8');
 const context={};vm.runInNewContext(src,{window:context});
 assert.equal(await context.COMPASS_PAGE2_STANDARD.standardize(html),html,'WH native runner must bypass legacy overlay');
 const chrome=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
 try{
  for(const viewport of [{width:1024,height:768},{width:1440,height:900}]){
   const page=await chrome.newPage({viewport});
   const errors=[];
   page.on('pageerror',err=>errors.push(err.message));
   page.on('dialog',d=>d.accept());
   await page.addInitScript(({targets})=>{
     window.__QA_REQUESTS__=[];
     window.__COMPASS_STUDENT_RUNTIME__={
       context:{assignment_id:'qa-wh-assignment',student_id:'qa-wh-student',
         targets:targets.map(t=>({id:'qa-'+t.key,target_key:t.key,target_name:t.name})),
         primary_behaviors:['Leaving area','Task refusal'],iep_goals:[],instance_config:{}},
       securePost:async data=>{
         window.__QA_REQUESTS__.push(data);
         if(data.action==='save_probe')return {ok:true,probe_saved:true,probe_id:'qa-probe'};
         return {ok:true,saved:true,programSetup:data.setup||{}};
       },
       saveSession:async data=>{
         window.__QA_REQUESTS__.push({action:'save_session',payload:data});
         return {ok:true,session_id:'qa-synthetic-session',saved_trial_events:data.trial_events?.length||0};
       }
     };
   },{targets:cfg.targets});
   await page.route('**/compass-program-runner?*',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>document.getElementById('benchmarkSelect')?.options.length===4);
   assert.deepEqual(await page.evaluate(ids=>ids.filter(id=>!document.getElementById(id)),markers),[]);
   assert.deepEqual(await page.locator('#arraySize option').evaluateAll(els=>els.map(e=>e.value)),['na','3']);
   assert(await page.locator('#arraySize').isEnabled(),'Array Size should not be disabled in WH Concepts');
   assert.equal(await page.locator('#arraySize').inputValue(),'na');
   assert.equal(await page.locator('#whGrade option').count(),9);
   assert.equal(await page.locator('#whLevel option').count(),4);
   assert.equal(await page.locator('#targetSelect option').count(),25);
   const kKey=await page.locator('#targetSelect').inputValue();
   await page.locator('#whGrade').selectOption('8');
   assert.equal(await page.locator('#targetSelect option').count(),25);
   assert.notEqual(await page.locator('#targetSelect').inputValue(),kKey);
   await page.locator('#whGrade').selectOption('K');
   await page.locator('#arraySize').selectOption('3');
   await page.locator('#whLevel').selectOption('2');
   await page.locator('#chainSelect').selectOption('IEP_TTTTT');
   assert.equal(await page.locator('#chainPreviewSteps .chain-step').count(),5);
   await page.locator('#saveSetupBtn').click();
   await page.waitForFunction(()=>window.__QA_REQUESTS__.some(r=>r.action==='save_setup'));
   await page.locator('#chainSelect').selectOption('T');
   await page.locator('#runBtn').click();
   await page.locator('#runPage.active').waitFor();
   const check=await page.evaluate(()=>{
     const stage=document.querySelector('#taskStage');
     const body=stage?.textContent||'';
     const staff=document.querySelector('#functionsVerbalStaffCue')?.textContent||'';
     const mat=document.querySelector('#runPage .material-card').getBoundingClientRect();
     const score=document.querySelector('#runPage .score-card').getBoundingClientRect();
     return{body,staff,choices:stage.querySelectorAll('[data-choice]').length,
       answer:stage.querySelectorAll('.wh-reading-task').length,
       selected:document.querySelector('#arraySize')?.value,
       ratio:mat.width/(mat.width+score.width),horizontal:document.documentElement.scrollWidth>window.innerWidth+2};
   });
   assert.equal(check.choices,3);
   assert.equal(check.answer,1);
   assert(check.body.includes('Read or listen'));
   assert(check.body.includes('Your question'));
   assert(check.body.includes('Who completes homework after school?'));
   assert(check.staff.includes('Maya'),'Expected answer must stay on staff side');
   assert(check.ratio>.62&&check.ratio<.76,'70/30 runner ratio changed');
   assert.equal(check.horizontal,false,'horizontal overflow');
   await page.locator('#taskStage [data-choice]').first().click();
   await page.locator('#actionsVerifyMaterialsBtn').click();
   await page.locator('[data-score="correct"]').first().click();
   await page.locator('#saveNextBtn').click();
   await page.waitForFunction(()=>window.__QA_REQUESTS__.some(r=>r.action==='save_session'));
   const saved=await page.evaluate(()=>window.__QA_REQUESTS__.find(r=>r.action==='save_session').payload);
   assert.equal(saved.target_key,'WH-K-01-01');
   assert.equal(saved.trial_events[0].target_key,'WH-K-01-01');
   assert.equal(saved.trial_events.length,1);
   assert.equal(saved.v25_run.array_size,'3');
   assert.equal(saved.v25_run.wh_grade,'K');
   assert.equal(saved.v25_run.wh_level,'2');
   await page.locator('#backBtn').click();
   await page.locator('#arraySize').selectOption('na');
   await page.locator('#whLevel').selectOption('4');
   await page.locator('#runBtn').click();
   await page.locator('#runPage.active').waitFor();
   assert.equal(await page.locator('#taskStage [data-choice]').count(),0,'N/A must remain open response');
   assert((await page.locator('#taskStage').innerText()).includes('After school, Maya'),'Full original passage missing');
   assert.deepEqual(errors,[],'JavaScript errors: '+errors.join('; '));
   console.log('WH_V25_SMOOTH_ARRAY_STRESS_PASS',JSON.stringify({viewport,markers:markers.length,
     targets:900,gradeLevels:9,benchmarks:4,levels:4,arrays:['na','3'],threeChoices:true,
     fullStoryPreserved:true,targetKeySaved:true,ratio:check.ratio}));
   await page.close();
  }
 }finally{await chrome.close()}
})().catch(err=>{console.error('WH_V25_SMOOTH_ARRAY_STRESS_FAIL',err);process.exitCode=1});
