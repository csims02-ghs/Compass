'use strict';
// Test the native Body Parts V25 program. The former bpRun adapter is archival.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const url='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-program-runner?program_code=CP-BODY-PARTS&format=html';
(async()=>{
 const hub=read('program-hub.html');
 assert(hub.includes('usesBodyParts(sp)')&&hub.includes('COMPASS_BODY_PARTS_SYNC_CONFIRMED'),'Body Parts student session bridge missing');
 const response=await fetch(url,{signal:AbortSignal.timeout(35000),headers:{'Cache-Control':'no-cache'}});
 assert.equal(response.status,200,'Native Body Parts V25 must respond');
 const html=await response.text();
 assert(html.includes('CP-BODY-PARTS'),'Missing Body Parts program identity');
 for(const marker of ['id="setupPage"','id="runPage"','id="benchmarkSelect"','id="targetSelect"','id="chainSelect"','id="saveSetupBtn"','id="runBtn"','id="runGrid"','id="behaviorList"','id="imagesOnlyBtn"']){
  assert(html.includes(marker),'Native Body Parts marker missing: '+marker);
 }
 assert(html.includes('IEP Chain'),'Body Parts IEP Chain missing');
 assert(!html.includes('compass-v25-fifty-review-launcher'),'Retired Body Parts preview launcher must be absent');
 const helper=read('compass-page2-standard.js'),ctx={window:{},fetch:async()=>{throw Error('Native Body Parts should not fetch an old adapter')}};
 vm.runInNewContext(helper,ctx);
 assert(ctx.window.COMPASS_PAGE2_STANDARD.isPage2Program(html),'Body Parts native run page not recognized');
 assert.equal(await ctx.window.COMPASS_PAGE2_STANDARD.standardize(html),html,'Native Body Parts must not be patched by legacy JS');
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const viewport of [{width:1024,height:768},{width:1366,height:768}]){
   const page=await browser.newPage({viewport});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/compass-program-runner?*',r=>r.fulfill({status:200,contentType:'text/html',body:html}));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
   await page.locator('#setupPage').waitFor({state:'visible',timeout:16000});
   const chain=page.locator('#chainSelect');
   const options=await chain.locator('option').allTextContents();
   const iep=options.findIndex(x=>x.includes('IEP Chain')),short=options.findIndex(x=>x.includes('Short'));
   assert.equal(iep,short+1,'IEP Chain must appear directly after Short');
   await chain.selectOption('iep');
   await page.locator('#runBtn').click();
   await page.locator('#runPage').waitFor({state:'visible',timeout:16000});
   const layout=await page.evaluate(()=>({
    width:document.documentElement.scrollWidth,viewport:innerWidth,
    materials:document.querySelector('#runGrid .material-card')?.getBoundingClientRect().width,
    scoring:document.querySelector('#runGrid .score-card')?.getBoundingClientRect().width,
    behavior:!!document.querySelector('#behaviorList'),
    runVisible:getComputedStyle(document.querySelector('#runPage')).display!=='none'
   }));
   assert(layout.runVisible&&layout.behavior,'Native run and behavior tracking must exist');
   assert(layout.width<=layout.viewport+12,'Body Parts horizontal overflow '+JSON.stringify(layout));
   assert(layout.materials>0&&layout.scoring>0,'Body Parts teaching/scoring panels not rendered');
   await page.locator('#imagesOnlyBtn').click();
   assert((await page.locator('#imagesOnlyBtn').textContent()).includes('Exit Images Only'),'Body Parts needs same-button Images Only exit');
   await page.locator('#imagesOnlyBtn').click();
   assert(!(await page.locator('#imagesOnlyBtn').textContent()).includes('Exit Images Only'),'Body Parts Images Only exit failed');
   assert.equal(errors.length,0,'Body Parts JS errors: '+errors.join(' | '));
   console.log('BODY_PARTS_NATIVE_V25_PASS',JSON.stringify({viewport,layout}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('BODY_PARTS_NATIVE_V25_FAIL',e);process.exit(1)});
