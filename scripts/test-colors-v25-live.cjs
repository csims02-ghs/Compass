'use strict';
// COMPASS Stability Restore: test the deployed native V25 Colors runner, never the retired multi-select UI.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {chromium}=require('playwright');
const base=path.resolve(__dirname,'..');
const url='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-program-runner?program_code=CP-COLORS&test=1';
(async()=>{
 const response=await fetch(url,{signal:AbortSignal.timeout(40000),headers:{'Cache-Control':'no-cache'}});
 assert.equal(response.status,200,'Live Colors V25 preview endpoint must load');
 const raw=await response.text();
 for(const token of ['id="setupPage"','id="runPage"','id="benchmarkSelect"','id="targetSelect"','id="chainSelect"','id="saveSetupBtn"','id="runBtn"','id="behaviorList"','id="imagesOnlyBtn"','id="runGrid"']){
   assert(raw.includes(token),'Native Colors V25 marker missing: '+token);
 }
 assert(raw.includes('IEP Chain'),'Required IEP chain is missing');
 assert(!raw.includes('multi-select-workspace'),'Retired multi-select runner is still active');
 assert(!raw.includes('compass-v25-fifty-review-launcher'),'Retired V25 review launcher was injected');
 const standardizer=fs.readFileSync(path.join(base,'compass-page2-standard.js'),'utf8');
 const w={};vm.runInNewContext(standardizer,{window:w,fetch:async()=>{throw Error('Native V25 must not fetch adapter assets')}});
 assert(w.COMPASS_PAGE2_STANDARD.isPage2Program(raw),'Colors native Page 2 was not recognized');
 const normalized=await w.COMPASS_PAGE2_STANDARD.standardize(raw);
 assert.equal(normalized,raw,'Native Colors V25 must not receive legacy adapter/CSS overlays');
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const viewport of [{width:1024,height:768},{width:1440,height:900}]){
   const page=await browser.newPage({viewport});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/compass-program-runner?*',route=>route.fulfill({status:200,contentType:'text/html',body:raw}));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
   await page.locator('#setupPage').waitFor({state:'visible',timeout:12000});
   const select=page.locator('#chainSelect');
   const options=await select.locator('option').allTextContents();
   const iep=options.findIndex(x=>x.includes('IEP Chain'));
   const short=options.findIndex(x=>x.includes('Short'));
   assert(iep===short+1,'IEP chain must follow Short');
   await select.selectOption('IEP_TTTTT');
   assert.equal(await select.inputValue(),'IEP_TTTTT','IEP chain did not select its five-target sequence');
   await page.locator('#runBtn').click();
   await page.locator('#runPage').waitFor({state:'visible',timeout:12000});
   const layout=await page.evaluate(()=>({
     runVisible:getComputedStyle(document.querySelector('#runPage')).display!=='none',
     width:document.documentElement.scrollWidth,
     viewport:window.innerWidth,
     materials:document.querySelector('#runGrid .material-card')?.getBoundingClientRect().width,
     scoring:document.querySelector('#runGrid .score-card')?.getBoundingClientRect().width
   }));
   assert(layout.runVisible,'Run page did not become visible');
   assert(layout.width<=layout.viewport+12,'Native Colors has horizontal overflow '+JSON.stringify(layout));
   assert(layout.materials>0&&layout.scoring>0,'Native Colors student and scoring panels missing');
   await page.locator('#imagesOnlyBtn').click();
   assert((await page.locator('#imagesOnlyBtn').textContent()).includes('Exit Images Only'),'Image-only toggle must expose Exit Images Only');
   await page.locator('#imagesOnlyBtn').click();
   assert(!(await page.locator('#imagesOnlyBtn').textContent()).includes('Exit Images Only'),'Image-only exit did not restore regular mode');
   assert.equal(errors.length,0,'Colors browser errors: '+errors.join(' | '));
   console.log('COLORS_NATIVE_V25_VIEWPORT_PASS',JSON.stringify({viewport,layout}));
   await page.close();
  }
  console.log('COLORS_NATIVE_V25_STRESS_PASS');
 }finally{await browser.close()}
})().catch(e=>{console.error('COLORS_NATIVE_V25_STRESS_FAIL',e);process.exit(1)});
