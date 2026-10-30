'use strict';
/** Non-destructive, strictly sequential COMPASS live runner audit.
 * Historical data is never written. No simultaneous program fetch/edit/test.
 * This does NOT claim 38/38 universal V25 marker parity or authorized cloud saving.
 */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base='https://ykkexfsbnnxgncnyaksr.supabase.co/functions/v1/compass-program-runner';
const cases=[
 {name:'1:1 Count',code:'CP-1TO1-COUNT',targets:100,chain:'setupChain',bench:null},
 {name:'Prepositions & Spatial Concepts',code:'CP-PREPOSITIONS-SPATIAL',targets:25,chain:'setupChain',bench:'setupBenchmark',benchCount:10},
 {name:'Pretend and Imaginative Play',code:'CP-116-PRETEND-AND-IMAGINATIVE-PLAY',targets:40,chain:'setupChain'},
 {name:'Requesting Help and Assistance',code:'CP-119-REQUESTING-HELP-AND-ASSISTANCE',targets:40,chain:'setupChain'},
 {name:'Letter Discrimination',code:'CP-LETTER-DISCRIMINATION',targets:220,chain:'chain',bench:'benchmark',benchCount:8},
 {name:'Less Than / Equal To / Greater Than',code:'CP-LESS-EQUAL-GREATER',targets:180,chain:'chain',bench:'benchmark',benchCount:12}
];
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
 try{
  const all=[];
  for(const spec of cases){ // deliberately not Promise.all()
   const url=base+'?program_code='+encodeURIComponent(spec.code)+'&format=html&qa=1';
   const response=await fetch(url,{signal:AbortSignal.timeout(40000)});
   assert.equal(response.status,200,spec.name+' response');
   const html=await response.text();
   assert(html.length>18000,spec.name+' malformed runner');
   for(const viewport of [{width:1024,height:768},{width:1366,height:768}]){
    const page=await browser.newPage({viewport});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('dialog',dialog=>{void dialog.dismiss()});
    await page.route('**/compass-program-runner?*',route=>route.fulfill({status:200,contentType:'text/html',body:html}));
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForTimeout(350);
    const result=await page.evaluate(({chainId,benchId})=>{
      const el=id=>id?document.getElementById(id):null;
      const chain=el(chainId);
      const options=chain?[...chain.options].map(x=>({label:x.textContent,value:x.value})):[];
      const found=options.findIndex(x=>x.label.toLowerCase().includes('iep chain')&&x.value.replace(/,/g,'')==='TTTTT');
      const short=options.findIndex(x=>x.label.toLowerCase().includes('short'));
      const benchmark=el(benchId);
      const targets=window.COMPASS_PROGRAM_CONFIG?.targets;
      return{
        title:document.title,htmlBytes:document.documentElement.outerHTML.length,
        chainPresent:!!chain,options,iep:found>=0,shortOrder:short>=0?found===short+1:null,
        benchCount:benchmark?.options.length??null,
        targetBank:Array.isArray(targets)?targets.length:null,
        setupVisible:!!document.querySelector('.program-setup')||
                     !!document.querySelector('#setupPage')||
                     !!document.querySelector('#setup'),
        twoPage:!!document.getElementById('setupPage')&&!!document.getElementById('runPage'),
        behaviors:!!document.getElementById('behaviorBar')||
                  !!document.getElementById('behaviorList')||
                  !!document.getElementById('behaviorItems'),
        horizontalOverflow:document.documentElement.scrollWidth>window.innerWidth+3,
        viewportWidth:window.innerWidth,
        bodyWidth:document.documentElement.scrollWidth,
        suspectedLocalOnly:!document.documentElement.outerHTML.includes('__COMPASS_STUDENT_RUNTIME__') &&
          !document.documentElement.outerHTML.includes('securePost')
      };
    },{chainId:spec.chain,benchId:spec.bench});
    assert(result.setupVisible,spec.name+' missing setup at '+viewport.width);
    assert(result.chainPresent,spec.name+' missing DTI chain at '+viewport.width);
    assert(result.iep,spec.name+' missing executable five-T IEP Chain at '+viewport.width);
    if(result.shortOrder!==null)assert(result.shortOrder,spec.name+' IEP Chain not after Short');
    if(result.targetBank!==null)assert.equal(result.targetBank,spec.targets,spec.name+' config target count');
    if(spec.benchCount&&result.benchCount!==null){
      assert.equal(result.benchCount,spec.benchCount,spec.name+' benchmark count');
    }
    if(errors.length)throw Error(spec.name+' browser error(s): '+errors.slice(0,2).join(' / '));
    console.log('COMPASS_SEQUENTIAL_PROGRAM_AUDIT',JSON.stringify({
      name:spec.name,viewport:viewport.width,benchmarkOptions:result.benchCount,
      targetBank:result.targetBank,chainOptions:result.options.length,iepAfterShort:result.shortOrder,
      twoPage:result.twoPage,horizontalOverflow:result.horizontalOverflow,
      localOnlyRisk:result.suspectedLocalOnly
    }));
    all.push({name:spec.name,viewport:viewport.width,passed:true});
    await page.close();
   }
  }
  assert.equal(all.length,12);
  console.log('COMPASS_SIX_PROGRAMS_SEQUENTIAL_SMOKE_PASS',JSON.stringify({programs:6,views:12,markerParity38Verified:false,authenticatedStudentSaveVerified:false}));
 }finally{await browser.close()}
})().catch(e=>{console.error('COMPASS_SIX_PROGRAMS_SEQUENTIAL_SMOKE_FAIL',e);process.exitCode=1});
