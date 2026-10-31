'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {chromium}=require('playwright');
const home=path.join(__dirname,'..'),read=n=>fs.readFileSync(path.join(home,n),'utf8');
const url='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-program-runner?program_code=CP-132-HANDWASHING-AND-HYGIENE&format=html';
const ids='appTitle backBtn resetViewBtn runBtn endBtn nextProgramBtn storageBanner setupPage selectedPill setupFold benchmarkSelect targetSelect probeTargetHelp chainSelect chainPreviewTitle chainPreviewText chainPreviewSteps skillSelect scoringSelect arraySize distractorSelect goalSelect masterySelect materialSelect modeSelect trialsSelect masteryTrialsSelect minOpportunitiesSelect circuitSelect saveSetupStatus saveSetupBtn instructionsFold runPage runGrid sdPrompt taskStage behaviorList saveNextBtn'.split(' ');
(async()=>{
 assert.equal(ids.length,38);assert.equal(new Set(ids).size,38);
 assert.doesNotThrow(()=>new Function(read('compass-handwashing-hygiene-v25.js')));
 const request=await fetch(url,{signal:AbortSignal.timeout(35000)});assert.equal(request.status,200);
 const legacy=await request.text();assert(legacy.includes("const PROGRAM_CODE='CP-132-HANDWASHING-AND-HYGIENE'"));
 const scope={window:{},fetch:async p=>({ok:true,text:async()=>p.includes('handwashing-hygiene-v25')?read('compass-handwashing-hygiene-v25.'+(p.includes('.css')?'css':'js')):read('compass-page2-standard.css')})};
 vm.runInNewContext(read('compass-page2-standard.js'),scope);
 const html=await scope.window.COMPASS_PAGE2_STANDARD.standardize(legacy);
 assert(html.includes('id="compass-handwashing-hygiene-v25-logic"')&&html.includes('id="compass-handwashing-hygiene-v25-ui"'));
 assert.equal(await scope.window.COMPASS_PAGE2_STANDARD.standardize(html),html,'Duplicate script injection');
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const viewport of [{width:1024,height:768},{width:1366,height:768},{width:1440,height:900},{width:1920,height:1080}]){
   const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',err=>errors.push(err.message));
   page.on('dialog',d=>d.accept());
   await page.addInitScript(()=>{
    window.__HW_TEST_CALLS__=[];
    window.__COMPASS_STUDENT_RUNTIME__={
      context:{assignment_id:'synthetic',targets:[],behaviors:[]},
      saveSession:async data=>{window.__HW_TEST_CALLS__.push({action:'session',data});return {ok:true,session_id:'synthetic-hw',saved_trial_events:data.trial_events.length};},
      securePost:async data=>{window.__HW_TEST_CALLS__.push({action:data.action,data});return data.action==='save_probe'?{ok:true,probe_saved:true}:{ok:true,saved:true,programSetup:data.setup};}
    };
   });
   await page.route('**/compass-program-runner?*',r=>r.fulfill({status:200,contentType:'text/html',body:html}));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
   await page.waitForFunction(()=>window.COMPASS_HANDWASH_V25?.ready,{timeout:14000});
   const meta=await page.evaluate(markerIds=>({
    missing:markerIds.filter(id=>!document.getElementById(id)),
    duplicate:markerIds.filter(id=>document.querySelectorAll('[id="'+id+'"]').length!==1),
    count:BANK.length,stages:[1,2,3,4,5].map(b=>BANK.filter(t=>t.benchmark===b).length),
    setup:!document.getElementById('setupPage').hidden,
    swatch:document.querySelector('#setupFold .setupgrid')?.children.length
   }),ids);
   assert.deepEqual(meta.missing,[]);assert.deepEqual(meta.duplicate,[]);
   assert.equal(meta.count,65);assert.deepEqual(meta.stages,[25,10,10,10,10]);assert(meta.setup);
   await page.evaluate(()=>{
    window.__COMPASS_STUDENT_RUNTIME__.context.targets=BANK.map(t=>({target_name:t.name,target_key:String(t.id)}));
    window.__COMPASS_STUDENT_RUNTIME__.context.behaviors=Array.from({length:8},(_,i)=>'Assigned Behavior '+(i+1));
   });
   await page.locator('#runBtn').click();await page.locator('#runPage').waitFor({state:'visible'});
   const first=await page.evaluate(()=>{
    const m=document.querySelector('.hv-material').getBoundingClientRect(),s=document.querySelector('.hv-scoring').getBoundingClientRect();
    return {ratio:m.width/(m.width+s.width),target:document.querySelector('#trialTitle').textContent,
      count:document.querySelectorAll('#behaviorBar .behavior').length,
      choices:document.querySelectorAll('#choices button').length,
      sd:document.querySelector('#sdText').textContent,steps:state.plan.length};
   });
   assert(first.ratio>.61&&first.ratio<.76,'70/30 ratio '+JSON.stringify(first));
   assert(first.count===8&&first.steps===8&&first.choices>=2,'Initial B1 layout '+JSON.stringify(first));
   assert(first.sd.includes('wash your hands'));
   await page.locator('#imagesOnlyBtn').click();assert(await page.locator('.hv-scoring').isHidden());
   await page.locator('#imagesOnlyBtn').click();assert(await page.locator('.hv-scoring').isVisible());
   for(let i=0;i<8;i++){
    await page.locator('#correctBtn').click();
    if(i<7){await page.locator('#saveNextBtn').click();await page.waitForFunction(n=>state.index===n,i+1,{timeout:3800})}
   }
   await page.waitForFunction(()=>window.COMPASS_HANDWASH_V25.getState().saveStatus==='saved',null,{timeout:8500});
   const done=await page.evaluate(()=>({calls:window.__HW_TEST_CALLS__,next:!document.querySelector('#nextProgramBtn').disabled,state:window.COMPASS_HANDWASH_V25.getState()}));
   assert(done.next&&done.calls.length===1&&done.calls[0].action==='session');
   assert(done.calls[0].data.trial_events.length===8);
   assert.equal(done.calls[0].data.counts.independent_correct,5);
   await page.locator('#backBtn').click();await page.locator('#setupPage').waitFor({state:'visible'});
   await page.locator('#benchmark').selectOption('3');
   await page.locator('#runBtn').click();await page.locator('#runPage').waitFor({state:'visible'});
   assert.equal(await page.locator('#choices button').count(),0,'B3 must have no artificial answer options');
   const b3=await page.evaluate(()=>({count:state.plan.length,bench:state.settings.benchmark,title:document.querySelector('#trialTitle').textContent}));
   assert.equal(b3.bench,3);assert(b3.count>=1);
   for(let i=0;i<b3.count;i++){await page.locator('#correctBtn').click();if(i<b3.count-1)await page.locator('#saveNextBtn').click()}
   await page.waitForFunction(()=>window.COMPASS_HANDWASH_V25.getState().saveStatus==='saved',null,{timeout:8500});
   assert.deepEqual(errors,[],'Script errors '+errors.join(' ; '));
   console.log('HANDWASHING_38_MARKERS_PASS '+JSON.stringify({viewport,ratio:first.ratio,benchmarks:meta.stages,scenarios:25,teachingSteps:done.calls[0].data.trial_events.length,behaviors:8}));
   await page.close();
  }
 }finally{await browser.close()}
 console.log('HANDWASHING_V25_STRESS_TEST_PASS');
})().catch(err=>{console.error('HANDWASHING_V25_STRESS_TEST_FAIL',err.stack||err);process.exitCode=1});
