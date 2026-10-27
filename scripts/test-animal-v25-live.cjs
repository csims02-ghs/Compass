'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const URL='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-program-runner?program_code=CP-ANIMAL-IDENTIFICATION&format=html';
const earlyStudentContext='<script id="compass-animals-student-context-v1">window.COMPASS_CONTEXT='+JSON.stringify({
 studentId:'test-student-animals',studentCompassProgramId:'test-assignment-animals',
 assignmentId:'test-assignment-animals',behaviors:['Noncompliance'],
 iepGoals:[{id:'test-goal',title:'Synthetic IEP Animal Goal',annual_goal_number:1,target_percent:80}],instanceConfig:{}
})+'</'+'script>';
const fixture=String.raw`<script id="animals-synthetic-student-qa">
window.__COMPASS_STUDENT_RUNTIME__={
 context:{assignment_id:'test-assignment-animals',student_id:'test-student-animals',student_name:'Synthetic Animal Learner',
   studentCompassProgramId:'test-assignment-animals',staff_id:'test-staff',primary_behaviors:['Noncompliance'],secondary_behaviors:[],
   iep_goals:[{id:'test-goal',title:'Synthetic IEP Animal Goal',annual_goal_number:1,target_percent:80}],instance_config:{programSetup:null},targets:[]},
 securePost:async p=>{
   if(window.__qaDeny)throw Error('Synthetic authorization denied');
   window.__qaCalls.push(p);
   if(p.action==='load_mastery')return {ok:true,target_name:p.target_name,qualifying_dates:0,minimum_dates:3,mastered:false};
   if(p.action==='save_setup')return {ok:true,saved:true,programSetup:p.setup};
   if(p.action==='save_probe')return {ok:true,probe_saved:true,probe_id:'synthetic-probe'};
   throw Error('Unexpected action '+p.action);
 },
 saveSession:async p=>{
   if(window.__qaDeny)throw Error('Synthetic session save denied');
   window.__qaCalls.push({action:'save_session',...p});
   return {ok:true,session_id:'synthetic-session',saved_trial_events:p.trial_events?.length||0};
 }
};window.__qaCalls=[];window.__qaDeny=false;
</script>`;
(async()=>{
 const response=await fetch(URL,{signal:AbortSignal.timeout(35000),headers:{'Cache-Control':'no-cache'}});
 assert.equal(response.status,200,'Animal Identification runner must be publicly reachable for program rendering');
 const html=await response.text();
 assert(html.includes('id="compassConfig"'),'V25 Animal Identification configuration must be delivered');
 assert(!html.includes('compass-v25-fifty-review-launcher'),'Legacy preview launcher must not override Actions');
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const size of [{width:1024,height:768},{width:900,height:580}]){
   const page=await browser.newPage({viewport:size});
   // Simulate a prior browser visit where the student selection had been cleared:
   // live Student Profile must restore its assigned behavior regardless of local state.
   await page.addInitScript(()=>{
     const key='COMPASS_V25_REVIEW_CP-ANIMAL-IDENTIFICATION_STUDENT_test-student-animals_ASSIGNMENT_test-assignment-animals';
     localStorage.setItem(key,JSON.stringify({runs:[],events:[],behaviorEvents:[],selectedBehaviors:[],
       behaviorAssignmentSignature:'Noncompliance'}));
   });
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/compass-program-runner?*',async route=>{
     await route.fulfill({status:200,contentType:'text/html',body:html.replace('</head>',earlyStudentContext+'</head>').replace('</body>',fixture+'</body>')});
   });
   await page.goto(URL);
   await page.locator('#targetSelect option').first().waitFor({state:'attached'});
   const basics=await page.evaluate(()=>{
    const C=JSON.parse(document.getElementById('compassConfig').textContent);
    return {targets:C.targets.length,bench:C.benchmarks.length,
      embedded:C.targets.filter(t=>t.image?.startsWith('data:image/jpeg;base64,')).length,
      missing:C.targets.filter(t=>!t.image).length,
      pageSetup:!!document.getElementById('setupPage'),
      pageRun:!!document.getElementById('runPage'),
      groups:[20,20,20,20,20]};
   });
   assert.equal(basics.targets,100);assert.equal(basics.bench,5);
   assert.equal(basics.embedded,100);assert.equal(basics.missing,0);
   assert(basics.pageSetup&&basics.pageRun);
   assert.equal(await page.locator('#benchmarkSelect option').count(),5);
   assert.equal(await page.locator('#goalSelect option').count(),2);
   const iepOption=await page.locator('#goalSelect option[value="test-goal"]').innerText();
   assert(iepOption.includes('IEP Goal 1')&&iepOption.includes('80%'),'Student setup must display linked IEP Goal # and Target %');
   await page.locator('#benchmarkSelect').selectOption('1');
   await page.locator('#circuitSelect').selectOption('probe');
   assert(await page.locator('#targetSelect').isDisabled(),'Full probe must lock target selector');
   await page.locator('#runBtn').click();
   await page.locator('#taskStage img').first().waitFor({state:'attached'});
   const picture=await page.locator('#taskStage img').first().evaluate(el=>({ok:el.complete&&el.naturalWidth>0,width:el.naturalWidth}));
   assert(picture.ok,'Embedded source picture must decode');
   const pictureSizing=await page.locator('#taskStage .stim-card img').first().evaluate(el=>{
     const box=el.getBoundingClientRect(),card=el.closest('.stim-card')?.getBoundingClientRect();
     return {height:box.height,cardHeight:card?.height||0,withinCard:!!card&&box.left>=card.left-2&&box.right<=card.right+2};
   });
   const expected=Math.min(325,Math.max(178,size.height*.38));
   assert(Math.abs(pictureSizing.height-expected)<=4,
     'Picture element should follow selected responsive size: '+JSON.stringify({pictureSizing,expected}));
   assert(pictureSizing.withinCard,'Expanded animal image must fit inside its existing card');
   for(let i=0;i<20;i++)await page.evaluate(()=>{
      document.querySelector('[data-score="correct"]').click();
      document.getElementById('saveNextBtn').click();
   });
   await page.waitForFunction(()=>window.COMPASS_REVIEW_TEST?.getRun()?.syncedProbeId);
   const five=await page.evaluate(()=>window.COMPASS_REVIEW_TEST.getRun());
   assert.equal(five.events.length,20);
   assert.equal(five.type,'probe');
   assert.equal(await page.locator('#nextProgramBtn').isDisabled(),false);
   await page.locator('#backBtn').click();
   for(const [benchmark,count] of [['2',20],['3',20],['4',20]]){
     await page.locator('#benchmarkSelect').selectOption(benchmark);
     await page.locator('#circuitSelect').selectOption('probe');
     assert(await page.locator('#targetSelect').isDisabled(),'Full benchmark must lock target selector');
     await page.locator('#runBtn').click();
     for(let step=0;step<count;step++)await page.evaluate(()=>{
       document.querySelector('[data-score="correct"]').click();
       document.getElementById('saveNextBtn').click();
     });
     await page.waitForFunction(()=>window.COMPASS_REVIEW_TEST?.getRun()?.syncedProbeId);
     const scored=await page.evaluate(()=>window.COMPASS_REVIEW_TEST.getRun().events.length);
     assert.equal(scored,count,'Benchmark '+benchmark+' must record every target');
     await page.locator('#backBtn').click();
   }
   await page.locator('#benchmarkSelect').selectOption('5');
   await page.locator('#circuitSelect').selectOption('probe');
   assert(await page.locator('#targetSelect').isDisabled());
   await page.locator('#runBtn').click();
   let missingMaterialChecks=0;
   for(let i=0;i<20;i++){
     const observed=await page.evaluate(()=>{
       const run=window.COMPASS_REVIEW_TEST.getRun(),step=run.steps[run.events.length];
       const absent=!step.target.image;
       const disabled=document.querySelector('[data-score="correct"]').disabled;
       const studentMaterial=document.getElementById('taskStage').textContent;
       if(absent&&disabled!==true)throw Error('Missing action image permitted scoring without material verification');
       if(absent&&studentMaterial.includes(step.target.name))throw Error('Unverified target answer leaked on student display: '+step.target.name);
       if(!absent&&disabled)throw Error('Verified embedded picture unexpectedly blocked');
       if(absent){
         const btn=document.getElementById('actionsVerifyMaterialsBtn');
         if(!btn)throw Error('Material verification button missing');
         btn.click();
         if(document.querySelector('[data-score="correct"]').disabled)throw Error('Scoring did not unlock after staff confirmed material');
       }
       document.querySelector('[data-score="correct"]').click();
       document.getElementById('saveNextBtn').click();
       return absent;
     });
     if(observed)missingMaterialChecks++;
   }
   assert.equal(missingMaterialChecks,0,'All 100 original animal pictures must be present — no missing-material gates');
   await page.waitForFunction(()=>window.COMPASS_REVIEW_TEST?.getRun()?.syncedProbeId);
   const res=await page.evaluate(()=>({run:window.COMPASS_REVIEW_TEST.getRun(),calls:window.__qaCalls,
       hasOverflow:document.documentElement.scrollWidth>innerWidth+3}));
   assert.equal(res.run.events.length,20);
   assert.equal(res.run.events.filter(e=>e.material_verified===true).length,20,'Every scored full-probe event requires accessible materials');
   assert.equal(res.calls.filter(x=>x.action==='save_probe').length,5);
   assert.equal(res.calls.filter(x=>x.action==='save_probe').at(-1).events.length,20);
   assert.equal(res.calls.filter(x=>x.action==='save_session').length,0);
   await page.locator('#backBtn').click();
   await page.locator('#circuitSelect').selectOption({index:0});
   await page.locator('#benchmarkSelect').selectOption('1');
   await page.locator('#goalSelect').selectOption('test-goal');
   await page.locator('#saveSetupBtn').click();
   await page.waitForFunction(()=>window.__qaCalls.some(x=>x.action==='save_setup'));
   await page.locator('#runBtn').click();
   const behaviorInitially=await page.evaluate(()=>window.COMPASS_REVIEW_TEST.getRun().behaviors);
   assert(Object.prototype.hasOwnProperty.call(behaviorInitially,'Noncompliance'),'Assigned student behavior should load automatically');
   const tracking=await page.evaluate(()=>{
     const container=document.querySelector('#runPage .score-card'),block=document.querySelector('#runPage .behavior-block');
     const c=container.getBoundingClientRect(),b=block.getBoundingClientRect();
     return {label:document.getElementById('behaviorList').textContent,
       trackingVisible:!!block&&b.top>=c.top-8&&b.top<c.bottom-15,
       trackTop:b.top,scorePanelBottom:c.bottom,staffPanelScrolled:container.scrollTop};
   });
   assert(tracking.label.includes('Noncompliance'),'The behavior label must render in staff controls');
   console.log('ANIMALS_STUDENT_BEHAVIOR_VISIBILITY',JSON.stringify({width:size.width,tracking}));
   await page.locator('#behaviorList .inc').first().click();
   const opportunities=await page.evaluate(()=>window.COMPASS_REVIEW_TEST.getRun().steps.length);
   for(let i=0;i<opportunities;i++)await page.evaluate(index=>{
     const outcome=index===0?'incorrect':index===1?'prompted':'correct';
     const button=document.querySelector('[data-score="'+outcome+'"]');
     if(!button)throw Error('Missing scoring button '+outcome);
     if(index===0 && !/Target Incorrect/.test(button.textContent))throw Error('Incorrect label missing');
     if(index===1 && !/Target Prompted/.test(button.textContent))throw Error('Prompted label missing');
     button.click();
     document.getElementById('saveNextBtn').click();
   },i);
   await page.waitForFunction(()=>window.COMPASS_REVIEW_TEST?.getRun()?.syncedSessionId);
   const sessionCalls=await page.evaluate(()=>window.__qaCalls.filter(x=>x.action==='save_session'));
   assert.equal(sessionCalls.length,1,'Teaching run must invoke student-specific save');
   assert.equal(sessionCalls[0].program_version,25);
   assert.equal(sessionCalls[0].trial_events.length,opportunities);
   assert.equal(sessionCalls[0].counts.incorrect,1,'Target Incorrect must be recorded once');
   assert.equal(sessionCalls[0].counts.prompted_correct,1,'Target Prompted must be recorded once');
   assert.equal(sessionCalls[0].trial_events[0].result,'incorrect');
   assert.equal(sessionCalls[0].trial_events[1].result,'prompted');
   assert(sessionCalls[0].counts.independent_correct>=1,'Remaining independent target trials retained');
   assert(sessionCalls[0].counts.independent_correct<opportunities-1,'Prompted must not count as independent correct');
   assert.equal(sessionCalls[0].goal_id,'test-goal');
   assert.equal(sessionCalls[0].behavior_counts['Noncompliance'],1,'Inherited student behavior must save with the teaching session');
   assert.equal(await page.locator('#nextProgramBtn').isDisabled(),false);
   await page.locator('#backBtn').click();
   await page.evaluate(()=>{window.__qaDeny=true});
   await page.locator('#runBtn').click();
   const retryTrials=await page.evaluate(()=>window.COMPASS_REVIEW_TEST.getRun().steps.length);
   for(let i=0;i<retryTrials;i++)await page.evaluate(()=>{
     document.querySelector('[data-score="correct"]').click();
     document.getElementById('saveNextBtn').click();
   });
   await page.waitForFunction(()=>document.getElementById('validation').textContent.includes('save failed'));
   console.log('ANIMALS_FAILED_SAVE_DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>({
     validation:document.getElementById('validation').textContent,
     nextDisabled:document.getElementById('nextProgramBtn').disabled,
     nextHidden:document.getElementById('nextProgramBtn').hidden,
     retryDisabled:document.getElementById('saveNextBtn').disabled,
     run:window.COMPASS_REVIEW_TEST.getRun()?.id,
     syncedSessionId:window.COMPASS_REVIEW_TEST.getRun()?.syncedSessionId||null,
     calls:window.__qaCalls.filter(x=>x.action==='save_session').length,
     denial:window.__qaDeny
   }))));
   assert.equal(await page.locator('#nextProgramBtn').isHidden(),true,'Saving failure must hide Next Program until a confirmed save');
   const blockedNavigation=await page.evaluate(async()=>{
     const messages=[];window.addEventListener('message',event=>{
       if(event.data?.type==='compass-next-program')messages.push(event.data);
     });
     const btn=document.getElementById('nextProgramBtn');
     btn.hidden=false;btn.disabled=false;btn.click();
     await new Promise(resolve=>setTimeout(resolve,80));
     return {blocked:btn.disabled,hidden:btn.hidden,emitted:messages.length,
       linked:window.COMPASS_REVIEW_SETUP?.isStudentLinked?.(),validation:document.getElementById('validation').textContent};
   });
   console.log('ANIMALS_FORCED_NAVIGATION_DIAG',JSON.stringify(blockedNavigation));
   assert.equal(blockedNavigation.emitted,0,'Failed session must never emit next-program navigation');
   assert.equal(await page.locator('#saveNextBtn').innerText(),'Retry COMPASS Save');
   await page.evaluate(()=>{window.__qaDeny=false});
   await page.locator('#saveNextBtn').click();
   await page.waitForFunction(()=>window.COMPASS_REVIEW_TEST?.getRun()?.syncedSessionId);
   assert.equal(await page.locator('#nextProgramBtn').isDisabled(),false,'Confirmed retry unlocks Next Program');
   assert.equal(await page.locator('#nextProgramBtn').isVisible(),true,'Confirmed retry reveals Next Program');
   assert.equal(errors.length,0,errors.join('\n'));
   console.log('ANIMALS_V25_LIVE_PROBE_PASS',JSON.stringify({width:size.width,
     targets:basics.targets,benchmarks:basics.bench,embeddedImages:basics.embedded,
     fullProbe:res.run.events.length,manualMaterialConfirmations:missingMaterialChecks,photoDecode:picture.ok,overflow:res.hasOverflow}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
