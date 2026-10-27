'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const base=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(base,'compass-colors-v25.js'),'utf8');
const css=fs.readFileSync(path.join(base,'compass-colors-v25.css'),'utf8');
const url='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-program-runner?program_code=CP-COLORS&test=1';
(async()=>{
 assert.doesNotThrow(()=>new Function(js));assert(css.includes('grid-template-columns:minmax(0,7fr) minmax(290px,3fr)'));
 const response=await fetch(url,{signal:AbortSignal.timeout(40000),headers:{'Cache-Control':'no-cache'}});
 assert.equal(response.status,200,'Colors live base runner must load');
 const raw=await response.text();
 assert(raw.includes('COMPASS_PROGRAM_CONFIG'),'Colors configuration not provided');
 assert(raw.includes('multi-select-workspace'),'Preserve multi-select runner');
 const html=raw.includes('id="compass-colors-v25-css"')?raw:
   raw.replace('</head>','<style id="compass-colors-v25-css">'+css+'</style></head>')
      .replace('</body>','<script id="compass-colors-v25-js">'+js+'<'+'/script></body>');
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const viewport of [{width:1024,height:768},{width:1366,height:768},{width:1440,height:900},{width:1920,height:1080}]){
   const page=await browser.newPage({viewport});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{
    window.__COL_QA_CALLS__=[];
    window.__COL_QA_SAVE_MODE__='ok';
    window.__COMPASS_STUDENT_RUNTIME__={
      context:{behaviors:[]},
      markProgramComplete(){window.__COL_QA_MARKED__=true;},
      autoSave:async(why,now)=>{
       window.__COL_QA_CALLS__.push({why,now});
       if(window.__COL_QA_SAVE_MODE__==='fail')throw new Error('Synthetic denial');
       return {ok:true,session_id:'synthetic-color-qa',saved_trial_events:window.__COMPASS_TRIAL_CAPTURE__?.getEvents?.().length||0};
      },
      securePost:async(p)=>{
       window.__COL_QA_CALLS__.push({action:p.action,trial_count:p.trial_events?.length});
       if(window.__COL_QA_SAVE_MODE__==='fail')throw new Error('Synthetic denial');
       return {ok:true,probe_saved:true};
      }
    };
   });
   await page.route('**/compass-program-runner?*',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
   await page.locator('#bpRun').waitFor({state:'visible',timeout:15000});
   const setup=await page.evaluate(()=>({
     code:window.COMPASS_PROGRAM_CONFIG?.program_code,
     count:window.COMPASS_PROGRAM_CONFIG?.targets?.length,
     skill:[...document.querySelector('#setupSkillType').options].filter(o=>!o.hidden).map(x=>x.value),
     benchmark:[...document.querySelector('#bpBenchmark').options].map(x=>x.textContent),
     firstTargetOptions:document.querySelector('#setupTarget').options.length,
     ready:window.__COMPASS_COLORS_V25__?.ready
   }));
   assert(setup.ready&&setup.code==='CP-COLORS'&&setup.count===12&&setup.benchmark.length===3&&setup.firstTargetOptions===5,'V25 config invalid '+JSON.stringify(setup));
   await page.locator('#bpBenchmark').selectOption('1');assert.equal(await page.locator('#setupTarget option').count(),10);
   await page.locator('#bpBenchmark').selectOption('2');assert.equal(await page.locator('#setupTarget option').count(),12);
   await page.locator('#bpBenchmark').selectOption('0');await page.locator('#setupTarget').selectOption('Red');
   await page.locator('#setupSkillType').selectOption('Expressive');
   await page.locator('#bpRun').click();await page.locator('#bpPageTwo').waitFor({state:'visible'});
   let data=await page.evaluate(()=>({choices:document.querySelectorAll('#bpMaterial .choice').length,
     sd:document.querySelector('#bpInstruction').textContent,
     material:document.querySelector('#bpMaterial').getBoundingClientRect().width,
     scores:document.querySelector('#bpScoring').getBoundingClientRect().width}));
   assert.equal(data.choices,1,'Expressive must show one color swatch');
   assert.equal(data.sd,'What color is this?');
   assert(data.material/(data.material+data.scores)>.61&&data.material/(data.material+data.scores)<.74,'70/30 ratio failed '+JSON.stringify(data));
   await page.locator('#bpImages').click();
   const only=await page.evaluate(()=>({hidden:getComputedStyle(document.querySelector('#bpScoring')).display==='none',
     exit:document.querySelector('#bpImages').textContent.includes('Exit Images Only')}));
   assert(only.hidden&&only.exit,'Images Only toggle failed');
   await page.locator('#bpImages').click();
   for(const number of [1,3,5,8]){
    await page.evaluate(n=>setBehaviorDefinitions(Array.from({length:n},(_,i)=>({key:'qa'+i,label:('Very long behavior label '+i+' repeated repeated')}))),number);
    const track=await page.evaluate(()=>({rows:document.querySelectorAll('#behaviorItems>.behavior').length,
      scroll:document.querySelector('#behaviorItems').scrollHeight>document.querySelector('#behaviorItems').clientHeight+2}));
    assert.equal(track.rows,number);
    if(number<=5)assert(!track.scroll,'Up to five behaviors must fit without own scrollbar '+number+' '+JSON.stringify(track));
   }
   await page.evaluate(()=>setBehaviorDefinitions([{key:'qa0',label:'Noncompliance'},{key:'qa1',label:'Elopement'}]));
   await page.locator('#behaviorItems .plus').first().click();
   assert.equal(await page.locator('#behaviorItems .count').first().innerText(),'1','Behavior count was not recorded');
   const total=Number(await page.locator('#trialTotal').innerText());assert(total>=3&&total<=15);
   const sequence=['correctBtn','promptedBtn','incorrectBtn','correctBtn'];
   for(let i=0;i<total;i++){
    await page.locator('#'+sequence[i%sequence.length]).click();
    if(i<total-1){
     assert.equal(await page.locator('#bpSaveNext').isDisabled(),false,'Save and next not enabled after score');
     await page.locator('#bpSaveNext').click();
    }
   }
   await page.waitForFunction(()=>window.__COMPASS_COLORS_V25__?.getState().syncState==='saved',null,{timeout:6500});
   const result=await page.evaluate(()=>({
     state:window.__COMPASS_COLORS_V25__.getState(),calls:window.__COL_QA_CALLS__,
     behavior:document.querySelector('#behaviorItems .count').textContent,
     marked:window.__COL_QA_MARKED__,
     nextDisabled:document.querySelector('#bpNextProgram').disabled
   }));
   assert(result.state.complete&&result.state.events.length===total&&result.calls.length===1&&result.marked&&!result.nextDisabled,'Score/prompt/autosave invalid '+JSON.stringify(result));
   const afterSave=await page.evaluate(()=>window.__COL_QA_CALLS__.length);
   assert.equal(afterSave,1,'No duplicate completion save');
   await page.locator('#bpBack').click();await page.locator('#bpPageOne').waitFor({state:'visible'});
   await page.locator('#setupSkillType').selectOption('Matching');await page.locator('#bpRun').click();
   assert.equal(await page.locator('#bpMatchingSample img').count(),1,'Matching sample must remain visible');
   assert(await page.locator('#bpMaterial .choice').count()>1,'Matching distractors missing');
   await page.locator('#bpBack').click();
   await page.locator('#setupSkillType').selectOption('Multi-Select Colors');
   for(const size of ['10','12','15','20']){
    await page.locator('#setupArray').selectOption(size);await page.locator('#bpRun').click();
    const rows=await page.locator('#bpMaterial .multi-select-choice').count();
    assert.equal(rows,Number(size),'Missing multi-select stimuli for '+size);
    await page.locator('#bpBack').click();
   }
   await page.locator('#setupSkillType').selectOption('Receptive');
   await page.locator('#bpCircuit').selectOption('probe');
   await page.locator('#bpBenchmark').selectOption('2');
   await page.locator('#bpRun').click();
   assert.equal(Number(await page.locator('#trialTotal').innerText()),12,'Probe must cover full benchmark');
   for(let i=0;i<12;i++){
    await page.locator('#correctBtn').click();
    if(i<11)await page.locator('#bpSaveNext').click();
   }
   await page.waitForFunction(()=>window.__COMPASS_COLORS_V25__?.getState().syncState==='saved',null,{timeout:6500});
   const probe=await page.evaluate(()=>({
     state:window.__COMPASS_COLORS_V25__.getState(),
     post:window.__COL_QA_CALLS__.find(x=>x.action==='save_probe')
   }));
   assert(probe.state.events.length===12&&probe.state.events.every(x=>x.probe&&x.trial_type==='T')&&probe.post?.trial_count===12,'Probe separation/save test failed '+JSON.stringify(probe));
   assert.deepEqual(errors,[],'Uncaught errors at '+JSON.stringify(viewport));
   console.log('COLORS_V25_VIEWPORT_PASS '+JSON.stringify({viewport,setup,layout_ratio:data.material/(data.material+data.scores),teaching:result.state.steps,probe:probe.state.steps,behavior:result.behavior,multi_select_sizes:[10,12,15,20]}));
   await page.close();
  }
 }finally{await browser.close();}
 console.log('COLORS_V25_STRESS_TEST_PASS');
})().catch(e=>{console.error('COLORS_V25_STRESS_TEST_FAIL',e.stack||e);process.exit(1)});
