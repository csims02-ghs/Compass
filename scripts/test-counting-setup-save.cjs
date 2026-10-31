'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const endpoint='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-program-runner?program_code=CP-1TO1-COUNT&preview_version=25&format=html';
const assignment='aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
(async()=>{
 const response=await fetch(endpoint,{signal:AbortSignal.timeout(35000)});
 assert.equal(response.status,200,'Native Counting V25 unavailable');
 const original=await response.text();
 assert(original.includes('id="setupPage"')&&original.includes('COMPASS · 1:1 Counting'),'Unexpected runner');
 const ctx={window:{},fetch:async url=>({ok:true,text:async()=>url.includes('counting-setup-save')?
  read('compass-counting-setup-save.'+(url.includes('.css')?'css':'js')):read('compass-page2-standard.css')})};
 vm.runInNewContext(read('compass-page2-standard.js'),ctx);
 const html=await ctx.window.COMPASS_PAGE2_STANDARD.standardize(original);
 assert(html.includes('id="compass-counting-setup-save-addon"'),'Save addon not injected');
 assert.equal(await ctx.window.COMPASS_PAGE2_STANDARD.standardize(html),html,'Repeated injection');
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const viewport of [{width:1024,height:768},{width:1440,height:900}]){
   const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
   const parent=[
   '<!DOCTYPE html><html><head><title>COMPASS QA</title></head><body style="margin:0">',
   '<iframe id="runner" src="/counting" style="width:100vw;height:100vh;border:0"></iframe>',
   '<script>window.requests=[];window.failSaves=false;window.cloudSaved=null;',
   'window.addEventListener("message",event=>{',
   'const m=event.data||{};if(m.type!=="compass-save-setup-request")return;window.requests.push(m);',
   'const outcome=window.failSaves?{ok:false,saved:false,error:"Synthetic cloud failure"}:{ok:true,saved:true,programSetup:m.setup};',
   'if(!window.failSaves)window.cloudSaved=m.setup;',
   'event.source.postMessage({type:"compass-save-setup-response",nonce:m.nonce,assignment_id:m.assignment_id,...outcome},location.origin);',
   '});',
   'document.querySelector("#runner").addEventListener("load",function(){this.contentWindow.postMessage({',
   'type:"COMPASS_DEMO_V18_CONTEXT",assignment_id:"'+assignment+'",',
   'student:{id:"synthetic-student",name:"Counting QA",goals:["Math"],behaviors:["Elopement"],schoolTimeZone:"America/New_York"},',
   'programSetup:window.cloudSaved,sessionId:null},location.origin)});',
   '<\/script></body></html>'
   ].join('');
   await page.route('https://compass-qa.example/**',route=>route.fulfill({status:200,contentType:'text/html',body:route.request().url().endsWith('/counting')?html:parent}));
   await page.goto('https://compass-qa.example/hub',{waitUntil:'domcontentloaded',timeout:35000});
   const frame=page.frameLocator('#runner');
   await frame.locator('#countingSaveSetupBtn').waitFor({state:'visible',timeout:18000});
   await page.waitForFunction(()=>document.querySelector('#runner').contentWindow?.COMPASS_COUNTING_SETUP_SAVE?.getState().assignmentAvailable,{timeout:12000});
   const baseline=await frame.locator('#countingSaveSetupBtn').evaluate(b=>({rect:b.getBoundingClientRect().toJSON(),connected:window.COMPASS_COUNTING_SETUP_SAVE.getState()}));
   assert(baseline.rect.width>100&&baseline.rect.top<viewport.height,'Save Setup must be visible without scrolling '+JSON.stringify(baseline.rect));
   await frame.locator('#benchmarkSelect').selectOption('1');
   await frame.locator('#targetSelect').selectOption('5');
   await frame.locator('#chainSelect').selectOption('iep');
   await frame.locator('#materialSelect').selectOption('block');
   await frame.locator('#countingSaveSetupBtn').click();
   await frame.locator('#countingSaveSetupStatus[data-status="success"]').waitFor({timeout:12000});
   const saved=await page.evaluate(()=>({requests:window.requests,saved:window.cloudSaved}));
   assert.equal(saved.requests.length,1);
   assert.equal(saved.requests[0].assignment_id,assignment);
   assert.equal(saved.saved.targetSelect,5);
   assert.equal(saved.saved.chainSelect,'iep');
   assert.equal(saved.saved.materialSelect,'block');
   assert(!JSON.stringify(saved.requests).includes('access_token'));
   await page.evaluate(()=>window.failSaves=true);
   await frame.locator('#materialSelect').selectOption('car');
   await frame.locator('#countingSaveSetupBtn').click();
   await frame.locator('#countingSaveSetupStatus[data-status="error"]').waitFor({timeout:12000});
   assert((await frame.locator('#countingSaveSetupStatus').textContent()).includes('Not saved'));
   await page.evaluate(()=>window.failSaves=false);
   await frame.locator('#countingSaveSetupBtn').click();
   await frame.locator('#countingSaveSetupStatus[data-status="success"]').waitFor({timeout:12000});
   await frame.locator('#benchmarkSelect').selectOption('0');
   await frame.locator('#materialSelect').selectOption('apple');
   await frame.locator('#countingRestoreSetupBtn').click();
   assert.equal(await frame.locator('#benchmarkSelect').inputValue(),'1');
   assert.equal(await frame.locator('#targetSelect').inputValue(),'5');
   assert.equal(await frame.locator('#materialSelect').inputValue(),'car');
   assert.deepEqual(errors,[],'Page errors: '+errors.join(' / '));
   console.log('COUNTING_SAVE_VIEWPORT_PASS '+JSON.stringify({viewport,buttonTop:baseline.rect.top,saveAndRestore:true}));
   await page.close();
  }
 }finally{await browser.close()}
 console.log('COUNTING_SETUP_SAVE_TESTS_PASS');
})().catch(e=>{console.error('COUNTING_SETUP_SAVE_TESTS_FAIL',e.stack||e);process.exitCode=1});
