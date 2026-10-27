'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(base,'compass-clothing-v25.js'),'utf8');
const css=fs.readFileSync(path.join(base,'compass-clothing-v25.css'),'utf8');
const url='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-program-runner?program_code=CP-CLOTHING-IDENTIFICATION&test=1';
(async()=>{
 assert.doesNotThrow(()=>new Function(code),'Clothing script must parse');
 assert(code.includes('getEvents')&&code.includes('COMPASS_CLO_V25'));
 assert(css.includes('grid-template-columns:minmax(0,7fr) minmax(290px,3fr)'));
 const response=await fetch(url,{signal:AbortSignal.timeout(35000),headers:{'Cache-Control':'no-cache'}});
 assert.equal(response.status,200,'Clothing runner must be served');
 const html=await response.text();
 for(const x of ['compass-clothing-v25-js','compass-clothing-v25-css','clothing-10-photo-data-v25-20261027','COMPASS TEST MODE'])assert(html.includes(x),'Required HTML marker missing '+x);
 const browser=await chromium.launch({headless:true,channel:'chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const viewport of [{width:1024,height:768},{width:1366,height:768},{width:1920,height:1080}]){
   const page=await browser.newPage({viewport});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{
    window.__CLO_TEST_SAVES__=0;
    window.__COMPASS_STUDENT_RUNTIME__={
     markProgramComplete(){window.__CLO_TEST_COMPLETE__=true},
     autoSave:async()=>{window.__CLO_TEST_SAVES__++;return {ok:true,session_id:'qa-synthetic'}}
    };
   });
   await page.route('**/compass-program-runner?*',r=>r.fulfill({status:200,contentType:'text/html',body:html}));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
   await page.locator('#bpRun').waitFor({state:'visible',timeout:16000});
   const setup=await page.evaluate(()=>{
    const c=window.COMPASS_PROGRAM_CONFIG,photos=c.targets.slice(0,10);
    return {
     ready:window.__COMPASS_CLO_V25__?.ready||false,
     benchmarks:document.querySelector('#bpBenchmark').options.length,
     currentTargets:document.querySelector('#setupTarget').options.length,
     targets:c.targets.length,first10:photos.map(t=>t.name),
     embedded:photos.filter(t=>/^data:image\/jpeg;base64,/.test(t.image||'')).length,
     allDistinct:new Set(photos.map(t=>t.image.slice(-300))).size===10,
     days:c.compass_v25_standard.scoring.teaching_distinct_dates_required,
     probesExcluded:c.compass_v25_standard.scoring.probe_counts_towards_teaching_mastery===false
    };
   });
   assert(setup.ready&&setup.benchmarks===4&&setup.currentTargets===5&&setup.targets===33&&setup.embedded===10&&setup.allDistinct&&setup.days===3&&setup.probesExcluded,
    'Clothing setup/data integrity invalid '+JSON.stringify(setup));
   await page.locator('#bpBenchmark').selectOption('1');
   assert.equal(await page.locator('#setupTarget option').count(),10,'Early benchmark must have first 10 targets');
   await page.locator('#bpBenchmark').selectOption('2');
   assert.equal(await page.locator('#setupTarget option').count(),20,'Intermediate benchmark must show 20 targets');
   await page.locator('#bpBenchmark').selectOption('3');
   assert.equal(await page.locator('#setupTarget option').count(),33,'Full library must show 33 targets');
   await page.locator('#bpBenchmark').selectOption('1');
   await page.locator('#setupTarget').selectOption('Shirt');
   await page.locator('#bpRun').click();
   await page.locator('#bpPageTwo').waitFor({state:'visible'});
   const render=await page.evaluate(()=>{
    const m=document.querySelector('#bpMaterial'),s=document.querySelector('#bpScoring');
    const ims=[...document.querySelectorAll('#bpMaterial #choices img')];
    return{ratio:m.getBoundingClientRect().width/(m.getBoundingClientRect().width+s.getBoundingClientRect().width),
     imageCount:ims.length,decoded:ims.filter(i=>i.complete&&i.naturalWidth>0).length,stage:document.querySelector('#bpContext').textContent};
   });
   assert(render.ratio>.60&&render.ratio<.77,'70/30-ish student/scoring layout invalid '+JSON.stringify(render));
   assert(render.imageCount>0&&render.decoded>0,'No actual clothing photo decoded '+JSON.stringify(render));
   await page.evaluate(()=>window.postMessage({type:'COMPASS_DEMO_V18_CONTEXT',student:{behaviors:['Elopement','Noncompliance','Aggression','Climbing','Screaming','Refusal','Throwing','Property','Extra','Extra2']}},location.origin));
   await page.waitForTimeout(120);
   const behavior=await page.evaluate(()=>{
    const x=document.querySelector('#behaviorItems');
    return{count:x.children.length,scroll:x.scrollHeight>x.clientHeight+2,height:x.clientHeight};
   });
   assert.equal(behavior.count,8,'Behavior tracker must cap eight assigned behaviors');
   assert(behavior.scroll,'Tracker must scroll after visible rows');
   await page.locator('#bpImages').click();
   const imageMode=await page.evaluate(()=>({
    hidden:getComputedStyle(document.querySelector('#bpScoring')).display==='none',
    label:document.querySelector('#bpImages').textContent,
    materialRatio:document.querySelector('#bpMaterial').getBoundingClientRect().width/innerWidth
   }));
   assert(imageMode.hidden&&imageMode.label.includes('Exit Images Only')&&imageMode.materialRatio>.85,
    'Image Only must fill screen and show exit button');
   await page.locator('#bpImages').click();
   const total=await page.locator('#trialTotal').innerText();
   const n=Number(total);
   assert(n>0&&n<=50,'Unexpected DTI steps '+total);
   const sequence=['correct','prompted','incorrect','correct','prompted','correct','incorrect','correct'];
   for(let i=0;i<n;i++){
    const how=sequence[i%sequence.length];
    await page.locator(how==='correct'?'#correctBtn':how==='incorrect'?'#incorrectBtn':'#promptedBtn').click();
    if(i<n-1)await page.waitForFunction(step=>Number(document.querySelector('#trialNum').textContent)===step,{timeout:3000},i+2);
   }
   await page.waitForFunction(()=>document.querySelector('#bpSaveStatus').textContent.includes('saved to COMPASS'),null,{timeout:7000});
   const saved=await page.evaluate(()=>{
    const events=window.__COMPASS_TRIAL_CAPTURE__?.getEvents()||[];
    return{complete:window.__CLO_TEST_COMPLETE__,saves:window.__CLO_TEST_SAVES__,records:events.length,
     prompted:events.filter(x=>x.result==='prompted').length,
     numbering:events.every((x,i)=>x.trial_number===i+1&&['T','D'].includes(x.trial_type)),
     nextEnabled:!document.querySelector('#bpNextProgram').disabled};
   });
   assert(saved.complete&&saved.saves>0&&saved.records===n&&saved.prompted>=2&&saved.numbering&&saved.nextEnabled,
    'Scoring/prompted capture/save guard failed '+JSON.stringify(saved));
   assert.deepEqual(errors,[],'Uncaught JavaScript errors during Clothing run');
   await page.screenshot({path:path.join(base,'compass-smoke-clothing-'+viewport.width+'.png')});
   console.log('CLOTHING_V25_VIEWPORT_PASS '+JSON.stringify({viewport,setup,render,behavior,imageMode,saved}));
   await page.close();
  }
 }finally{await browser.close()}
 console.log('CLOTHING_V25_LIVE_SMOKE_PASS');
})().catch(e=>{console.error('CLOTHING_V25_SMOKE_FAIL',e.stack||e);process.exit(1)});