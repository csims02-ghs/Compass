'use strict';
// COMPASS Stability Restore: verify native Clothing V25, not the archived bpRun adapter.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const url='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-program-runner?program_code=CP-CLOTHING-IDENTIFICATION&test=1';
(async()=>{
 const res=await fetch(url,{signal:AbortSignal.timeout(35000),headers:{'Cache-Control':'no-cache'}});
 assert.equal(res.status,200,'Native Clothing preview must load');
 const html=await res.text();
 assert(html.includes('CP-CLOTHING-IDENTIFICATION'),'Clothing identity missing');
 for(const marker of ['id="setupPage"','id="runPage"','id="benchmarkSelect"','id="targetSelect"','id="chainSelect"','id="saveSetupBtn"','id="runBtn"','id="runGrid"','id="behaviorList"','id="imagesOnlyBtn"']){
  assert(html.includes(marker),'Clothing native V25 marker missing: '+marker);
 }
 assert(html.includes('IEP Chain'),'Clothing IEP Chain missing');
 assert(!html.includes('compass-v25-fifty-review-launcher'),'Legacy Clothing review launcher still injected');
 const ctx={window:{},fetch:async()=>{throw Error('Native Clothing must not use an old adapter')}};
 vm.runInNewContext(read('compass-page2-standard.js'),ctx);
 assert(ctx.window.COMPASS_PAGE2_STANDARD.isPage2Program(html),'Clothing native runner was not recognized');
 assert.equal(await ctx.window.COMPASS_PAGE2_STANDARD.standardize(html),html,'Clothing native HTML must not be overlaid');
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const viewport of [{width:1024,height:768},{width:1366,height:768}]){
   const page=await browser.newPage({viewport});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/compass-program-runner?*',r=>r.fulfill({status:200,contentType:'text/html',body:html}));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
   await page.locator('#setupPage').waitFor({state:'visible',timeout:16000});
   const chains=await page.locator('#chainSelect option').allTextContents();
   const i=chains.findIndex(s=>s.includes('IEP Chain')),j=chains.findIndex(s=>s.includes('Short'));
   assert.equal(i,j+1,'Clothing IEP Chain must directly follow Short');
   await page.locator('#chainSelect').selectOption('IEP_TTTTT');
   await page.locator('#runBtn').click();
   await page.locator('#runPage').waitFor({state:'visible',timeout:16000});
   const layout=await page.evaluate(()=>({
    doc:document.documentElement.scrollWidth,viewport:innerWidth,
    material:document.querySelector('#runGrid .material-card')?.getBoundingClientRect().width,
    scoring:document.querySelector('#runGrid .score-card')?.getBoundingClientRect().width,
    tracking:!!document.querySelector('#behaviorList')
   }));
   assert(layout.doc<=layout.viewport+12,'Clothing overflow '+JSON.stringify(layout));
   assert(layout.material>0&&layout.scoring>0&&layout.tracking,'Clothing Page 2 panels missing');
   await page.locator('#imagesOnlyBtn').click();
   assert((await page.locator('#imagesOnlyBtn').textContent()).includes('Exit Images Only'),'Images Only must show same-button exit');
   await page.locator('#imagesOnlyBtn').click();
   assert(!(await page.locator('#imagesOnlyBtn').textContent()).includes('Exit Images Only'),'Clothing Images Only did not exit');
   assert.equal(errors.length,0,'Clothing browser JS errors: '+errors.join(' | '));
   console.log('CLOTHING_NATIVE_V25_PASS',JSON.stringify({viewport,layout}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('CLOTHING_NATIVE_V25_FAIL',e);process.exit(1)});
