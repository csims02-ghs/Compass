'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const url='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-program-runner?program_code=CP-WH-CONCEPTS&qa=20261031-multi';
const markers=['appTitle','backBtn','resetViewBtn','runBtn','endBtn','nextProgramBtn','storageBanner','setupPage','selectedPill','setupFold','benchmarkSelect','targetSelect','probeTargetHelp','chainSelect','chainPreviewTitle','chainPreviewText','chainPreviewSteps','skillSelect','scoringSelect','arraySize','distractorSelect','goalSelect','masterySelect','materialSelect','modeSelect','trialsSelect','masteryTrialsSelect','minOpportunitiesSelect','circuitSelect','saveSetupStatus','saveSetupBtn','instructionsFold','runPage','runGrid','sdPrompt','taskStage','behaviorList','saveNextBtn'];
assert.equal(markers.length,38);
(async()=>{
 const response=await fetch(url,{signal:AbortSignal.timeout(40000)});
 assert.equal(response.status,200,'WH live runner unavailable');
 const html=await response.text();
 const m=html.match(/<script id="compassConfig" type="application\/json">([\s\S]*?)<\/script>/);
 assert(m,'embedded bank not found');
 const config=JSON.parse(m[1]);
 assert.equal(config.targets.length,900);
 assert.equal(config.scenes.length,25);
 assert.equal(config.scenes[0].extra_qa.length,1);
 assert.equal(config.scenes[0].extra_qa[0].answer,'Blue');
 assert.equal(new Set(config.targets.map(t=>t.key)).size,900);
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(x=>!x[1].includes('application/json'));scripts.forEach(x=>new Function(x[2]));
 const standard=fs.readFileSync(path.join(__dirname,'..','compass-page2-standard.js'),'utf8'),host={};
 vm.runInNewContext(standard,{window:host});assert.equal(await host.COMPASS_PAGE2_STANDARD.standardize(html),html,'Native WH runner must not be overlaid');
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
 try{
  for(const viewport of [{width:1024,height:768},{width:1440,height:900}]){
   const page=await browser.newPage({viewport}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
   await page.addInitScript(({bank})=>{
     window.__QA_REQUESTS__=[];
     window.__COMPASS_STUDENT_RUNTIME__={
       context:{assignment_id:'qa-wh-assignment',student_id:'qa-wh-student',targets:bank.map(t=>({id:'qa-'+t.key,target_key:t.key,target_name:t.name})),primary_behaviors:['Leaving area'],iep_goals:[],instance_config:{}},
       securePost:async request=>{window.__QA_REQUESTS__.push(request);return request.action==='save_probe'?{ok:true,probe_saved:true,probe_id:'qa-wh-probe'}:{ok:true,saved:true};},
       saveSession:async payload=>{window.__QA_REQUESTS__.push({action:'save_session',payload});return{ok:true,session_id:'qa-wh-session',saved_trial_events:payload.trial_events?.length||0}}
     };
   },{bank:config.targets});
   await page.route('**/compass-program-runner?*',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>document.getElementById('benchmarkSelect')?.options.length===4,null,{timeout:15000});
   const missing=await page.evaluate(markers=>markers.filter(id=>!document.getElementById(id)),markers);
   assert.deepEqual(missing,[],'Lost locked structural markers');
   assert.deepEqual(await page.locator('#whQuestionMode option').evaluateAll(xs=>xs.map(x=>x.value)),['mixed','focused']);
   assert.deepEqual(await page.locator('#whFocus option').evaluateAll(xs=>xs.map(x=>x.value)),['WHO','WHAT','WHERE','WHEN','WHY','HOW','WHICH','WHOSE']);
   assert.equal(await page.locator('#whGrade option').count(),9);
   assert.equal(await page.locator('#targetSelect option').count(),25);
   assert((await page.locator('#targetSelect option').first().textContent()).includes('Homework at home'));
   assert.equal(await page.locator('#whQuestionMode').inputValue(),'mixed');
   assert(await page.locator('#whFocus').isDisabled());
   await page.locator('#arraySize').selectOption('na');
   await page.locator('#chainSelect').selectOption('TTDTDDTT');
   await page.locator('#saveSetupBtn').click();
   await page.waitForFunction(()=>window.__QA_REQUESTS__.some(x=>x.action==='save_setup'));
   const setup=await page.evaluate(()=>window.__QA_REQUESTS__.find(x=>x.action==='save_setup'));
   assert.equal(setup.setup.whQuestionMode,'mixed');
   await page.locator('#runBtn').click();
   await page.locator('#runPage.active').waitFor();
   const dimensions=await page.evaluate(()=>{
     const mat=document.querySelector('#runPage .material-card').getBoundingClientRect();
     const score=document.querySelector('#runPage .score-card').getBoundingClientRect();
     return{ratio:mat.width/(mat.width+score.width),overflow:document.documentElement.scrollWidth>innerWidth+2}
   });
   assert(dimensions.ratio>.62&&dimensions.ratio<.76,'70/30 ratio failure');
   assert.equal(dimensions.overflow,false,'landscape horizontal overflow');
   const observed=[];
   for(let i=0;i<8;i++){
     const current=await page.evaluate(()=>{
       const st=window.COMPASS_REVIEW_TEST.getRun(),e=st.steps[st.events.length];
       return{question:e.whQuestion?.question,type:e.whQuestion?.type,answer:e.whQuestion?.answer,key:e.whQuestionKey,storyId:e.whQuestion?.storyId,body:document.getElementById('taskStage').textContent,staff:document.getElementById('functionsVerbalStaffCue').textContent}
     });
     assert(current.question&&current.body.includes(current.question),'Question not rendered on student side');
     assert(current.staff.includes(current.answer),'Wrong staff answer for question');
     assert.equal(current.storyId,1,'Mixed WH should ask multiple questions from selected story');
     observed.push(current);
     await page.locator('#actionsVerifyMaterialsBtn').click();
     await page.locator('[data-score="correct"]').first().click();
     await page.locator('#saveNextBtn').click();
     await page.waitForFunction(n=>window.COMPASS_REVIEW_TEST.getRun().events.length>=n,i+1,{timeout:8000});
   }
   assert.equal(new Set(observed.map(x=>x.key)).size,8,'Repeated question in one mixed chain');
   assert.deepEqual(observed.slice(0,5).map(x=>x.type),['WHO','WHERE','WHAT','WHAT','WHEN']);
   assert.equal(observed[3].question,"What color was Maya's notebook?");
   assert.equal(observed[3].answer,'Blue');
   await page.waitForFunction(()=>window.__QA_REQUESTS__.some(x=>x.action==='save_session'));
   const mixed=await page.evaluate(()=>window.__QA_REQUESTS__.filter(x=>x.action==='save_session').at(-1).payload);
   assert.equal(mixed.v25_run.wh_question_mode,'mixed');
   assert.equal(mixed.v25_run.wh_questions.length,8);
   assert.equal(new Set(mixed.v25_run.wh_questions.map(x=>x.question_key)).size,8);
   assert.equal(mixed.trial_events.length,8);
   assert.equal(mixed.trial_events[3].wh_type,'WHAT');
   assert.equal(mixed.trial_events[3].question_key,'WH-K-01-01:WHAT_COLOR_NOTEBOOK');
   await page.locator('#backBtn').click();
   await page.locator('#whQuestionMode').selectOption('focused');
   await page.locator('#whFocus').selectOption('WHERE');
   assert(await page.locator('#whFocus').isEnabled());
   await page.locator('#chainSelect').selectOption('IEP_TTTTT');
   assert.equal(await page.locator('#chainPreviewSteps .chain-step').count(),5);
   await page.locator('#arraySize').selectOption('3');
   await page.locator('#runBtn').click();
   await page.locator('#runPage.active').waitFor();
   const focused=await page.evaluate(()=>window.COMPASS_REVIEW_TEST.getRun().steps.map(x=>({type:x.whQuestion?.type,key:x.whQuestionKey,scene:x.whQuestion?.storyId,question:x.whQuestion?.question})));
   assert.equal(focused.length,5);
   assert(focused.every(x=>x.type==='WHERE'),'WH focus must remain WHERE for each question');
   assert.equal(new Set(focused.map(x=>x.key)).size,5);
   assert.equal(new Set(focused.map(x=>x.scene)).size,5,'Focus practice should rotate across stories');
   assert.equal(await page.locator('#taskStage [data-choice]').count(),3);
   await page.locator('#actionsVerifyMaterialsBtn').click();
   await page.locator('[data-score="correct"]').first().click();
   await page.locator('#saveNextBtn').click();
   assert.equal(await page.locator('#taskStage [data-choice]').count(),3);
   await page.locator('#backBtn').click();
   await page.locator('#whQuestionMode').selectOption('focused');
   await page.locator('#whFocus').selectOption('WHO');
   await page.locator('#circuitSelect').selectOption('probe');
   await page.locator('#runBtn').click();
   const probe=await page.evaluate(()=>window.COMPASS_REVIEW_TEST.getRun().steps);
   assert.equal(probe.length,25);
   assert(probe.every(x=>x.whQuestion?.type==='WHO'));
   for(let i=0;i<25;i++){
     await page.locator('#actionsVerifyMaterialsBtn').click();
     await page.locator('[data-score="correct"]').first().click();
     await page.locator('#saveNextBtn').click();
     await page.waitForFunction(n=>window.COMPASS_REVIEW_TEST.getRun().events.length>=n,i+1,{timeout:8000});
   }
   await page.waitForFunction(()=>window.__QA_REQUESTS__.some(x=>x.action==='save_probe'));
   const saveProbe=await page.evaluate(()=>window.__QA_REQUESTS__.find(x=>x.action==='save_probe'));
   assert.equal(saveProbe.benchmark_key,'WH-K-B1');
   assert.equal(saveProbe.events.length,25);
   assert.equal(new Set(saveProbe.events.map(x=>x.target_key)).size,25);
   assert.deepEqual(errors,[],'Browser JS errors');
   console.log('WH_MULTI_QUESTION_STRESS_PASS',JSON.stringify({viewport,markers:markers.length,originalTargets:900,storyQuestions:201,mixedDistinct:8,focusedDistinct:5,probeQuestions:25,scopedBenchmark:'WH-K-B1',ratio:dimensions.ratio}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('WH_MULTI_QUESTION_STRESS_FAIL',e);process.exitCode=1});
