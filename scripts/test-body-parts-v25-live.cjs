'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const js=read('compass-body-parts-v25.js'),css=read('compass-body-parts-v25.css'),helper=read('compass-page2-standard.js'),hub=read('program-hub.html');
const url='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-program-runner?program_code=CP-BODY-PARTS&format=html';
(async()=>{
 assert.doesNotThrow(()=>new Function(js));
 assert(hub.includes('usesBodyParts(sp)')&&hub.includes('COMPASS_BODY_PARTS_SYNC_CONFIRMED'));
 const response=await fetch(url,{signal:AbortSignal.timeout(35000),headers:{'Cache-Control':'no-cache'}});
 assert.equal(response.status,200,'Live Body Parts program must respond');
 const original=await response.text();
 assert(original.includes('CP-BODY-PARTS'),'Live program bootstrap must identify Body Parts');
 const ctx={window:{},fetch:async p=>({ok:true,text:async()=>String(p).includes('body-parts-v25.css')?css:String(p).includes('body-parts-v25.js')?js:read('compass-page2-standard.css')})};
 vm.runInNewContext(helper,ctx);
 const patched=await ctx.window.COMPASS_PAGE2_STANDARD.standardize(original);
 assert(patched.includes('id="compass-body-parts-v25-ui"'));
 assert(patched.includes('id="compass-body-parts-v25-logic"'));
 assert.equal(await ctx.window.COMPASS_PAGE2_STANDARD.standardize(patched),patched,'Patch should be idempotent');
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const viewport of [{width:1024,height:768},{width:1366,height:768},{width:1920,height:1080}]){
   const page=await browser.newPage({viewport});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/compass-program-runner?*',route=>route.fulfill({status:200,contentType:'text/html',body:patched}));
   await page.goto(url,{waitUntil:'domcontentloaded'});
   await page.locator('#bpRun').waitFor({state:'visible',timeout:12000});
   const setup=await page.evaluate(()=>({ready:!!window.__COMPASS_BP_V25__?.ready,avatars:document.querySelector('#bpAvatar').options.length,benchmarks:document.querySelector('#bpBenchmark').options.length,targets:document.querySelector('#setupTarget').options.length}));
   assert(setup.ready&&setup.avatars===6&&setup.benchmarks>=5&&setup.targets>0,'Setup invalid '+JSON.stringify(setup));
   await page.locator('#bpRun').click();
   await page.locator('#bpPageTwo').waitFor({state:'visible'});
   const pictures=await page.evaluate(()=>{
    const a=document.querySelector('#bpMaterial').getBoundingClientRect(),b=document.querySelector('#bpScoring').getBoundingClientRect();
    const img=[...document.querySelectorAll('#bpMaterial #choices img')];
    return {count:img.length,decoded:img.every(x=>x.complete&&x.naturalWidth>0),ratio:a.width/(a.width+b.width)};
   });
   assert(pictures.count>=2&&pictures.decoded,'Body Parts clipart images must decode');
   assert(pictures.ratio>.56&&pictures.ratio<.76,'70/30 balance lost');
   await page.evaluate(()=>window.postMessage({type:'COMPASS_DEMO_V18_CONTEXT',student:{id:'synthetic-student',behaviors:['Noncompliance','Elopement','Self Injury','Tantrums','Screaming']}},location.origin));
   await page.waitForTimeout(100);
   const behavior=await page.evaluate(()=>{const box=document.querySelector('#behaviorItems');return{count:box.children.length,scroll:box.scrollHeight>box.clientHeight+2}});
   assert.equal(behavior.count,5);assert(!behavior.scroll,'Five behavior rows should not scroll');
   await page.locator('#bpImages').click();
   const imageMode=await page.evaluate(()=>({hidden:getComputedStyle(document.querySelector('#bpScoring')).display==='none',label:document.querySelector('#bpImages').textContent,wide:document.querySelector('#bpMaterial').getBoundingClientRect().width/innerWidth}));
   assert(imageMode.hidden&&imageMode.label.includes('Exit Images Only')&&imageMode.wide>.85);
   await page.locator('#bpImages').click();
   await page.locator('#correctBtn').click();
   await page.waitForTimeout(250);
   const next=await page.locator('#bpContext').innerText();
   assert(next.includes('Step 2 /'),'Scoring must advance to next step: '+next);
   if(viewport.width===1366){
    await page.locator('#bpBack').click();
    await page.locator('#bpBenchmark').selectOption('All 1–30');
    assert.equal(await page.locator('#setupTarget option').count(),30,'Full Body Parts library must have 30 selectable targets');
    await page.locator('#setupTarget').selectOption('Tongue');
    await page.locator('#bpSelf').selectOption('self');
    await page.locator('#bpRun').click();
    const self=await page.evaluate(()=>({
      prompt:document.querySelector('#bpInstruction').textContent,
      noteVisible:getComputedStyle(document.querySelector('#bpSelfNote')).display!=='none',
      imagesButtonDisabled:document.querySelector('#bpImages').disabled,
      choicesHidden:getComputedStyle(document.querySelector('#choices')).display==='none'
    }));
    assert(self.prompt.includes('tongue')&&self.noteVisible&&self.imagesButtonDisabled&&self.choicesHidden,
      'Self Identification must change the instructional task and suppress picture choices: '+JSON.stringify(self));
    console.log('BODY_PARTS_SELF_IDENTIFICATION_PASS '+JSON.stringify(self));
   }
   assert.deepEqual(errors,[],'Body Parts JavaScript errors');
   console.log('BODY_PARTS_V25_PASS '+JSON.stringify({viewport,setup,pictures,behavior,imageMode,next}));
   await page.close();
  }
 }finally{await browser.close()}
 console.log('BODY_PARTS_V25_LIVE_PASS');
})().catch(e=>{console.error('BODY_PARTS_V25_FAIL',e.stack||e);process.exit(1)});
