'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {chromium}=require('playwright');
const base=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(base,p),'utf8');
const url='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-program-runner?program_code=CP-153-MATERIALS-ORGANIZATION&format=html';
const ids='appTitle backBtn resetViewBtn runBtn endBtn nextProgramBtn storageBanner setupPage selectedPill setupFold benchmarkSelect targetSelect probeTargetHelp chainSelect chainPreviewTitle chainPreviewText chainPreviewSteps skillSelect scoringSelect arraySize distractorSelect goalSelect masterySelect materialSelect modeSelect trialsSelect masteryTrialsSelect minOpportunitiesSelect circuitSelect saveSetupStatus saveSetupBtn instructionsFold runPage runGrid sdPrompt taskStage behaviorList saveNextBtn'.split(' ');
(async()=>{
 assert.equal(ids.length,38);assert.equal(new Set(ids).size,38);
 const js=read('compass-materials-organization-v25.js'),css=read('compass-materials-organization-v25.css');
 assert.doesNotThrow(()=>new Function(js));
 const r=await fetch(url,{signal:AbortSignal.timeout(35000)});assert.equal(r.status,200);
 const raw=await r.text();assert(raw.includes('CP-153-MATERIALS-ORGANIZATION'),'Unexpected program code');
 const context={window:{},fetch:async asset=>({ok:true,text:async()=>asset.includes('materials-organization-v25')?(asset.includes('.css')?css:js):read('compass-page2-standard.css')})};
 vm.runInNewContext(read('compass-page2-standard.js'),context);
 const html=await context.window.COMPASS_PAGE2_STANDARD.standardize(raw);
 assert(html.includes('id="compass-materials-organization-v25-ui"')&&html.includes('id="compass-materials-organization-v25-logic"'),'Missing V25 overlay');
 assert.equal(await context.window.COMPASS_PAGE2_STANDARD.standardize(html),html,'Double-injected V25');
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 for(const viewport of [{width:1024,height:768},{width:1366,height:768},{width:1440,height:900},{width:1920,height:1080}]){
  const page=await browser.newPage({viewport}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.addInitScript(()=>{
   window.__MATERIALS_CLOUD__=[];window.__MATERIALS_FAIL__=false;
   window.__COMPASS_STUDENT_RUNTIME__={
    context:{assignment_id:'synthetic-materials-assignment',targets:Array.from({length:40},(_,i)=>({target_name:'FAKE '+(i+1),target_key:String(i+1)})),
      behaviors:Array.from({length:8},(_,i)=>'Behavior '+i),primary_behaviors:Array.from({length:8},(_,i)=>'Behavior '+i)},
    saveSession:async payload=>{window.__MATERIALS_CLOUD__.push({type:'session',payload});if(window.__MATERIALS_FAIL__)throw Error('Synthetic cloud failure');return {ok:true,session_id:'synthetic-materials-session',saved_trial_events:payload.trial_events.length};},
    securePost:async data=>{window.__MATERIALS_CLOUD__.push({type:data.action,payload:data});if(window.__MATERIALS_FAIL__)throw Error('Synthetic cloud failure');return data.action==='save_probe'?{ok:true,probe_saved:true}:{ok:true,saved:true};}
   };
  });
  await page.route('**/compass-program-runner?*',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
  await page.waitForFunction(()=>window.COMPASS_MATERIALS_V25?.ready,{timeout:13000});
  const initial=await page.evaluate(ids=>{
   const cfg=window.COMPASS_PROGRAM_CONFIG||{};
   window.__COMPASS_STUDENT_RUNTIME__.context.targets=cfg.targets.map(t=>({target_name:t.name,target_key:String(t.id)}));
   return {missing:ids.filter(id=>!document.getElementById(id)),
     duplicate:ids.filter(id=>document.querySelectorAll('[id="'+id+'"]').length!==1),
     targets:cfg.targets.length,benchmarks:cfg.compass_v25_standard?.benchmarks?.map(x=>x.members?.length),
     displayed:document.querySelector('#benchmarkSelect').options.length,
     chains:[...document.querySelector('#chainSelect').options].map(x=>x.textContent),
     arrays:[...document.querySelector('#arraySize').options].map(x=>x.value)};
  },ids);
  assert.deepEqual(initial.missing,[],'Missing marker IDs');assert.deepEqual(initial.duplicate,[],'Duplicate IDs');
  assert.equal(initial.targets,40);assert.deepEqual(initial.benchmarks,[10,10,10,10]);assert.equal(initial.displayed,4);
  assert.deepEqual(initial.arrays,['0']);assert.equal(initial.chains.findIndex(x=>x.includes('IEP Chain')),initial.chains.findIndex(x=>x.includes('Short'))+1);
  await page.locator('#benchmarkSelect').selectOption('3');
  assert((await page.locator('#targetSelect option').first().textContent()).includes('31'),'Benchmark 4 must start with target 31');
  await page.locator('#benchmarkSelect').selectOption('0');
  await page.locator('#chainSelect').selectOption('default');
  await page.locator('#saveSetupBtn').click();
  await page.waitForFunction(()=>window.__MATERIALS_CLOUD__.some(x=>x.type==='save_setup'),null,{timeout:5000});
  assert((await page.locator('#saveSetupStatus').textContent()).includes('Saved'));
  await page.locator('#runBtn').click();
  await page.locator('#runPage').waitFor({state:'visible'});
  const view=await page.evaluate(()=>{
   const m=document.querySelector('.material-card').getBoundingClientRect(),s=document.querySelector('.score-card').getBoundingClientRect();
   return {ratio:m.width/(m.width+s.width),task:document.querySelector('#sdPrompt').textContent,
    choices:document.querySelector('#materialsAnswers').childElementCount,steps:window.COMPASS_MATERIALS_V25.getState().steps,
    behaviors:document.querySelectorAll('.add-behavior-row').length};
  });
  assert(view.ratio>.61&&view.ratio<.75,'70:30 width mismatch '+JSON.stringify(view));
  assert(view.task&&view.choices===0&&view.steps===8&&view.behaviors===8,'Hands-on material setup failed '+JSON.stringify(view));
  await page.locator('#imagesOnlyBtn').click();assert(await page.locator('.score-card').isHidden(),'Materials Only should hide staff scoring');
  await page.locator('#imagesOnlyBtn').click();assert(await page.locator('.score-card').isVisible());
  await page.locator('.add-behavior-row button').last().click();
  for(let i=0;i<8;i++){
   await page.locator('[data-score="'+(i===1?'prompted':i===2?'incorrect':'correct')+'"]').click();
   if(i<7)await page.locator('#saveNextBtn').click();
  }
  await page.waitForFunction(()=>window.COMPASS_MATERIALS_V25.getState().saveStatus==='saved',null,{timeout:6500});
  const completed=await page.evaluate(()=>({state:window.COMPASS_MATERIALS_V25.getState(),cloud:window.__MATERIALS_CLOUD__}));
  const session=completed.cloud.find(x=>x.type==='session');
  assert(session&&session.payload.trial_events.length===8&&session.payload.counts.prompted_correct===1);
  assert.equal(session.payload.counts.independent_correct,4,'Default chain has four independent targets and one prompted target; distractors excluded');
  assert.equal(session.payload.counts.incorrect,0,'Incorrect maintenance must not lower target accuracy');
  assert.equal(session.payload.trial_events.filter(e=>e.trial_type==='D'&&e.result==='incorrect').length,1);
  assert.equal(await page.locator('#nextProgramBtn').isDisabled(),false);
  await page.locator('#backBtn').click();await page.locator('#circuitSelect').selectOption('probe');
  await page.locator('#runBtn').click();assert.equal(await page.locator('#materialsProgress').textContent(),'1 / 10');
  if(viewport.width===1024)await page.evaluate(()=>{window.__MATERIALS_FAIL__=true});
  for(let i=0;i<10;i++){
   await page.locator('[data-score="correct"]').click();
   if(i<9)await page.locator('#saveNextBtn').click();
  }
  await page.waitForFunction(state=>window.COMPASS_MATERIALS_V25.getState().saveStatus===state,viewport.width===1024?'failed':'saved',{timeout:6500});
  if(viewport.width===1024){
   assert(await page.locator('#nextProgramBtn').isHidden(),'Next Program blocked on failure');
   await page.evaluate(()=>{window.__MATERIALS_FAIL__=false});
   await page.locator('#saveNextBtn').click();await page.waitForFunction(()=>window.COMPASS_MATERIALS_V25.getState().saveStatus==='saved',null,{timeout:6500});
  }
  const probe=await page.evaluate(()=>window.__MATERIALS_CLOUD__.findLast(x=>x.type==='save_probe'));
  assert.equal(probe.payload.events.length,10);
  assert.equal(new Set(probe.payload.events.map(x=>x.target_name)).size,10);
  assert.equal(probe.payload.benchmark_key,'1');
  assert.deepEqual(errors,[],'Browser errors');
  console.log('MATERIALS_38_MARKERS_PASS '+JSON.stringify({viewport,ratio:view.ratio,targets:40,benchmarks:initial.benchmarks,teaching:8,probe:10,behaviors:8}));
  await page.close();
 }
 }finally{await browser.close()}
 console.log('MATERIALS_V25_STRESS_PASS');
})().catch(e=>{console.error('MATERIALS_V25_STRESS_FAIL',e.stack||e);process.exitCode=1});
