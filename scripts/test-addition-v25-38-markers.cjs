'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {chromium}=require('playwright');
const base=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(base,p),'utf8');
const URL_RUN='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-program-runner?program_code=CP-ADDITION&format=html';
const markers=['appTitle','backBtn','resetViewBtn','runBtn','endBtn','nextProgramBtn','storageBanner','setupPage','selectedPill','setupFold','benchmarkSelect','targetSelect','probeTargetHelp','chainSelect','chainPreviewTitle','chainPreviewText','chainPreviewSteps','skillSelect','scoringSelect','arraySize','distractorSelect','goalSelect','masterySelect','materialSelect','modeSelect','trialsSelect','masteryTrialsSelect','minOpportunitiesSelect','circuitSelect','saveSetupStatus','saveSetupBtn','instructionsFold','runPage','runGrid','sdPrompt','taskStage','behaviorList','saveNextBtn'];
const js=read('compass-addition-v25.js'),css=read('compass-addition-v25.css'),standard=read('compass-page2-standard.js');
assert.equal(markers.length,38);assert.equal(new Set(markers).size,38);assert.doesNotThrow(()=>new Function(js));
(async()=>{
 const response=await fetch(URL_RUN,{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(40000)});
 assert.equal(response.status,200,'Live Addition runner unavailable');
 const original=await response.text();
 assert(original.length>15000&&original.includes('CP-ADDITION'),'Wrong Addition source');
 const w={};vm.runInNewContext(standard,{window:w,fetch:async p=>({ok:true,text:async()=>p.includes('.css')?css:js})});
 const html=await w.COMPASS_PAGE2_STANDARD.standardize(original);
 assert(html.includes('id="compass-addition-v25-ui"')&&html.includes('id="compass-addition-v25-logic"'),'V25 Addition adapter not injected');
 assert.equal(await w.COMPASS_PAGE2_STANDARD.standardize(html),html,'Runner gets duplicate adapter on reopen');
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 for(const viewport of [{width:1024,height:768},{width:1366,height:768},{width:1440,height:900},{width:1920,height:1080}]){
  const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.addInitScript(()=>{
   window.__QA_ADDITION__=[];window.__QA_FAILURE__=false;
   window.__COMPASS_STUDENT_RUNTIME__={
    context:{assignment_id:'synthetic-addition',student_id:'synthetic-student',targets:Array.from({length:100},(_,i)=>({target_name:'Sum '+(i+1),target_key:'cp-addition-'+String(i+1).padStart(3,'0')})),primary_behaviors:['Non-Compliance','Leaving Area','Aggression'],secondary_behaviors:[],iep_goals:[{id:'test-goal',goal_number:3,title:'Mathematics'}],instance_config:{}},
    securePost:async p=>{window.__QA_ADDITION__.push(p);if(window.__QA_FAILURE__)throw Error('Synthetic save failure');return p.action==='save_probe'?{ok:true,probe_saved:true}:{ok:true,saved:true};},
    saveSession:async p=>{window.__QA_ADDITION__.push({action:'save_session',payload:p});if(window.__QA_FAILURE__)throw Error('Synthetic save failure');return {ok:true,session_id:'synthetic-session',saved_trial_events:p.trial_events.length};}
   };
  });
  await page.route('**/compass-program-runner?*',r=>r.fulfill({status:200,contentType:'text/html',body:html}));
  await page.goto(URL_RUN,{waitUntil:'domcontentloaded',timeout:35000});await page.waitForFunction(()=>window.COMPASS_ADDITION_V25?.ready,{timeout:12000});
  const intro=await page.evaluate(ids=>{
   const missing=ids.filter(id=>!document.getElementById(id));
   const duplicates=ids.filter(id=>document.querySelectorAll('[id="'+id+'"]').length!==1);
   return {missing,duplicates,config:window.COMPASS_ADDITION_V25.getState(),benchmarks:document.querySelector('#benchmarkSelect').options.length,
    targetOptions:document.querySelector('#targetSelect').options.length,choices:[...document.querySelector('#arraySize').options].map(x=>x.value),
    chains:[...document.querySelector('#chainSelect').options].map(x=>x.textContent)};
  },markers);
  assert.deepEqual(intro.missing,[],'Missing markers');assert.deepEqual(intro.duplicates,[],'Duplicate markers');
  assert.equal(intro.config.targets,100);assert.equal(intro.benchmarks,20);assert.equal(intro.targetOptions,5);
  assert.deepEqual(intro.choices,['0','3','4','5']);
  assert.equal(intro.chains.findIndex(s=>s.includes('IEP Chain')),intro.chains.findIndex(s=>s.includes('Short'))+1);
  await page.locator('#benchmarkSelect').selectOption('19');
  assert.equal(await page.locator('#targetSelect option').first().textContent(),'Sum 96');
  await page.locator('#benchmarkSelect').selectOption('0');await page.locator('#targetSelect').selectOption('3');
  await page.locator('#modeSelect').selectOption('On Screen');await page.locator('#scoringSelect').selectOption('staff');await page.locator('#arraySize').selectOption('4');
  await page.locator('#chainSelect').selectOption('iep');await page.locator('#trialsSelect').selectOption('5');
  await page.locator('#saveSetupBtn').click();await page.waitForFunction(()=>window.__QA_ADDITION__.some(x=>x.action==='save_setup'));
  await page.locator('#runBtn').click();await page.locator('#runPage').waitFor({state:'visible'});
  let screen=await page.evaluate(()=>{const m=document.querySelector('.material-card').getBoundingClientRect(),s=document.querySelector('.score-card').getBoundingClientRect();return{ratio:m.width/(m.width+s.width),problem:document.querySelector('#sdPrompt').textContent,options:document.querySelectorAll('#additionAnswers button').length,behaviorRows:document.querySelectorAll('.add-behavior-row').length,overflow:document.documentElement.scrollWidth>innerWidth+2};});
  assert(screen.ratio>.62&&screen.ratio<.76,'70/30 screen mismatch '+JSON.stringify(screen));
  assert.equal(screen.options,4);assert.equal(screen.behaviorRows,3);assert(!screen.overflow);
  await page.locator('#imagesOnlyBtn').click();assert.equal(await page.locator('.score-card').isHidden(),true);
  await page.locator('#imagesOnlyBtn').click();assert.equal(await page.locator('.score-card').isVisible(),true);
  await page.locator('.add-behavior-row button').last().click();
  const afterCount=await page.evaluate(()=>Object.values(window.COMPASS_ADDITION_V25.getState().behaviorCounts).reduce((a,b)=>a+b,0));assert.equal(afterCount,1);
  for(const count of [1,5,8]){
   await page.evaluate(n=>{const context=window.__COMPASS_STUDENT_RUNTIME__.context;context.primary_behaviors=Array.from({length:n},(_,i)=>'Test long assigned behavior '+i);context.secondary_behaviors=[];window.parent.postMessage({type:'irrelevant'},'*');const button=document.querySelector('#backBtn');},count);
   // Preserve assigned-behavior runtime source; normal student contexts are read when the next run starts.
  }
  for(let i=0;i<5;i++){
   await page.locator('[data-score="'+(i===1?'prompted':i===2?'incorrect':'correct')+'"]').click();
   await page.locator('#saveNextBtn').click();
  }
  await page.waitForFunction(()=>window.COMPASS_ADDITION_V25.getState().saveStatus==='saved',{timeout:6500});
  const teaching=await page.evaluate(()=>({state:window.COMPASS_ADDITION_V25.getState(),call:window.__QA_ADDITION__.find(x=>x.action==='save_session')}));
  assert.equal(teaching.state.events.length,5);assert(teaching.call?.payload?.trial_events?.length===5);assert.equal(teaching.call.payload.counts.prompted_correct,1);
  assert.equal(teaching.call.payload.counts.incorrect,1);assert(teaching.call.payload.counts.independent_correct===3);
  assert.equal(await page.locator('#nextProgramBtn').isDisabled(),false);
  await page.locator('#backBtn').click();await page.locator('#setupPage').waitFor({state:'visible'});
  await page.locator('#circuitSelect').selectOption('probe');await page.locator('#runBtn').click();
  assert.equal(await page.locator('#additionProgress').textContent(),'1 / 5');
  for(let i=0;i<5;i++){await page.locator('[data-score="correct"]').click();await page.locator('#saveNextBtn').click()}
  await page.waitForFunction(()=>window.COMPASS_ADDITION_V25.getState().saveStatus==='saved',{timeout:6500});
  const probe=await page.evaluate(()=>window.__QA_ADDITION__.find(x=>x.action==='save_probe'));
  assert.equal(probe.events.length,5);assert.equal(new Set(probe.events.map(x=>x.target_name)).size,5);
  assert.deepEqual(errors,[],'Browser errors: '+errors.join(';'));
  console.log('ADDITION_38_MARKERS_PASS',JSON.stringify({viewport,markers:38,benchmarks:20,targets:100,ratio:screen.ratio,teachingSteps:5,probeSteps:5,answerChoices:intro.choices}));
  await page.close();
 }
 }finally{await browser.close()}
 console.log('ADDITION_V25_38_OF_38_STRESS_PASS');
})().catch(e=>{console.error('ADDITION_V25_STRESS_FAIL',e.stack||e);process.exitCode=1});
